// Bypass pattern detector — detects multi-step adversarial sequences
// in agent behavior using a sliding window of recent governance decisions.
// Stateful per session; each pattern is a function over the window.

import type { GovernanceDecisionRecord } from '@red-codes/core';

export interface BypassDetection {
  detected: boolean;
  patternId: string;
  confidence: number;
  sequence: string[];
}

export interface BypassDetector {
  evaluate(record: GovernanceDecisionRecord): BypassDetection | null;
  getDetections(): BypassDetection[];
}

type PatternMatcher = (window: GovernanceDecisionRecord[]) => BypassDetection | null;

const DEFAULT_WINDOW_SIZE = 10;

const CREDENTIAL_PATH_PATTERNS = [/\.env/, /credential/i, /secret/i, /\.ssh/i, /\.aws/i, /token/i];

const EXFIL_COMMAND_PATTERNS = [/\bcurl\b/, /\bwget\b/, /\bfetch\b/, /\bnc\b/, /\bnetcat\b/];

const ENCODE_COMMAND_PATTERNS = [/\bbase64\b/, /\bencode\b/, /\bxxd\b/, /\bopenssl\b/];

/** Pattern: Read a credential file, then execute a network command */
function matchExfilCredential(window: GovernanceDecisionRecord[]): BypassDetection | null {
  let credReadIdx = -1;

  for (let i = 0; i < window.length; i++) {
    const r = window[i];

    // Look for file.read on credential paths
    if (r.action.type === 'file.read' || r.action.type === 'file.write') {
      const target = r.action.target ?? '';
      if (CREDENTIAL_PATH_PATTERNS.some((p) => p.test(target))) {
        credReadIdx = i;
      }
    }

    // Look for shell.exec with exfil commands after a credential read
    if (credReadIdx >= 0 && i > credReadIdx && r.action.type === 'shell.exec') {
      const cmd = r.action.command ?? '';
      if (EXFIL_COMMAND_PATTERNS.some((p) => p.test(cmd))) {
        return {
          detected: true,
          patternId: 'exfil-credential',
          confidence: 0.9,
          sequence: window.slice(credReadIdx, i + 1).map((w) => w.action.type),
        };
      }
    }
  }

  return null;
}

/** Pattern: Read .env, encode contents, then attempt network upload */
function matchEnvEncodeUpload(window: GovernanceDecisionRecord[]): BypassDetection | null {
  let envReadIdx = -1;
  let encodeIdx = -1;

  for (let i = 0; i < window.length; i++) {
    const r = window[i];
    const target = r.action.target ?? '';
    const cmd = r.action.command ?? '';

    if (
      (r.action.type === 'file.read' && /\.env/.test(target)) ||
      (r.action.type === 'shell.exec' && /\.env/.test(cmd))
    ) {
      envReadIdx = i;
      encodeIdx = -1; // reset
    }

    if (envReadIdx >= 0 && i > envReadIdx && r.action.type === 'shell.exec') {
      if (ENCODE_COMMAND_PATTERNS.some((p) => p.test(cmd))) {
        encodeIdx = i;
      }
    }

    if (encodeIdx >= 0 && i > encodeIdx && r.action.type === 'shell.exec') {
      if (EXFIL_COMMAND_PATTERNS.some((p) => p.test(cmd))) {
        return {
          detected: true,
          patternId: 'env-encode-upload',
          confidence: 0.95,
          sequence: window.slice(envReadIdx, i + 1).map((w) => w.action.type),
        };
      }
    }
  }

  return null;
}

/** Pattern: Read a policy file then write to the same policy file */
function matchBypassPolicyFile(window: GovernanceDecisionRecord[]): BypassDetection | null {
  const policyPatterns = [/agentguard\.ya?ml/i, /policy\.ya?ml/i, /policy\.json/i];

  for (let i = 0; i < window.length; i++) {
    const r = window[i];
    if (r.action.type !== 'file.read') continue;
    const target = r.action.target ?? '';
    if (!policyPatterns.some((p) => p.test(target))) continue;

    // Look for a write to the same file after this read
    for (let j = i + 1; j < window.length; j++) {
      const w = window[j];
      if (w.action.type === 'file.write' && w.action.target === target) {
        return {
          detected: true,
          patternId: 'bypass-policy-file',
          confidence: 0.85,
          sequence: window.slice(i, j + 1).map((e) => e.action.type),
        };
      }
    }
  }

  return null;
}

/** Pattern: git.push denied, then git.push with --force */
function matchForcePushAfterDeny(window: GovernanceDecisionRecord[]): BypassDetection | null {
  for (let i = 0; i < window.length; i++) {
    const r = window[i];
    if (r.action.type === 'git.push' && r.outcome === 'deny') {
      // Look for a subsequent git.push with --force
      for (let j = i + 1; j < window.length; j++) {
        const w = window[j];
        if (w.action.type === 'git.push') {
          const cmd = w.action.command ?? '';
          if (/--force|--force-with-lease|-f\b/.test(cmd)) {
            return {
              detected: true,
              patternId: 'force-push-after-deny',
              confidence: 0.8,
              sequence: window.slice(i, j + 1).map((e) => e.action.type),
            };
          }
        }
      }
    }
  }

  return null;
}

const BUILT_IN_PATTERNS: PatternMatcher[] = [
  matchExfilCredential,
  matchEnvEncodeUpload,
  matchBypassPolicyFile,
  matchForcePushAfterDeny,
];

/** Create a bypass detector with a sliding window of recent actions */
export function createBypassDetector(windowSize = DEFAULT_WINDOW_SIZE): BypassDetector {
  const window: GovernanceDecisionRecord[] = [];
  const detections: BypassDetection[] = [];

  return {
    evaluate(record: GovernanceDecisionRecord): BypassDetection | null {
      window.push(record);
      if (window.length > windowSize) {
        window.shift();
      }

      for (const matcher of BUILT_IN_PATTERNS) {
        try {
          const result = matcher(window);
          if (result) {
            detections.push(result);
            return result;
          }
        } catch {
          // Pattern match failures are non-fatal
        }
      }

      return null;
    },

    getDetections(): BypassDetection[] {
      return [...detections];
    },
  };
}
