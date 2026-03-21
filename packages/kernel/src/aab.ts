// Action Authorization Boundary (AAB)
// The central gatekeeper in the Runtime Assurance Architecture.
// Pure domain logic. No DOM, no Node.js-specific APIs.

import type {
  DomainEvent,
  AgentPersona,
  CompiledDestructivePattern,
  ActionContext,
  ActionClass,
} from '@red-codes/core';
import {
  TOOL_ACTION_MAP_DATA,
  DESTRUCTIVE_PATTERNS_DATA,
  GIT_ACTION_PATTERNS_DATA,
} from '@red-codes/core';
import { CommandScanner } from '@red-codes/matchers';
import { evaluate } from '@red-codes/policy';
import type {
  NormalizedIntent,
  EvalResult,
  LoadedPolicy,
  EvaluateOptions,
} from '@red-codes/policy';
import {
  createEvent,
  POLICY_DENIED,
  UNAUTHORIZED_ACTION,
  BLAST_RADIUS_EXCEEDED,
} from '@red-codes/events';
import { computeBlastRadius } from './blast-radius.js';
import type { BlastRadiusResult } from './blast-radius.js';

export interface RawAgentAction {
  tool?: string;
  command?: string;
  file?: string;
  target?: string;
  content?: string;
  branch?: string;
  agent?: string;
  persona?: AgentPersona;
  filesAffected?: number;
  metadata?: Record<string, unknown>;
}

export interface AuthorizationResult {
  intent: NormalizedIntent;
  result: EvalResult;
  events: DomainEvent[];
  blastRadius?: BlastRadiusResult;
}

const TOOL_ACTION_MAP: Record<string, string> = TOOL_ACTION_MAP_DATA;

const scanner = CommandScanner.create(DESTRUCTIVE_PATTERNS_DATA, GIT_ACTION_PATTERNS_DATA);

// Backward-compatible compiled patterns for consumers that import DESTRUCTIVE_PATTERNS directly.
const DESTRUCTIVE_PATTERNS: DestructivePattern[] = DESTRUCTIVE_PATTERNS_DATA.map((p) => ({
  pattern: new RegExp(p.pattern, p.flags),
  description: p.description,
  riskLevel: p.riskLevel,
  category: p.category,
}));

function detectGitAction(command: string): string | null {
  if (!command || typeof command !== 'string') return null;
  const result = scanner.scanGitAction(command.trim());
  return result ? result.actionType : null;
}

export type DestructiveRiskLevel = 'high' | 'critical';

export type DestructivePattern = CompiledDestructivePattern;

function isDestructiveCommand(command: string): boolean {
  if (!command || typeof command !== 'string') return false;
  return scanner.isDestructive(command);
}

// Maps patternId → original data index for stable ordering in getDestructiveDetails.
const PATTERN_INDEX_MAP = new Map<string, number>();
for (let i = 0; i < DESTRUCTIVE_PATTERNS_DATA.length; i++) {
  PATTERN_INDEX_MAP.set(`destructive:${DESTRUCTIVE_PATTERNS_DATA[i]!.category}:${i}`, i);
}

function getDestructiveDetails(command: string): DestructivePattern | null {
  if (!command || typeof command !== 'string') return null;
  const results = scanner.scanDestructive(command);
  if (results.length === 0) return null;

  // Pick the match with the lowest original pattern index (same order as old sequential scan).
  let best = results[0]!;
  let bestIdx = PATTERN_INDEX_MAP.get(best.patternId) ?? Infinity;
  for (let i = 1; i < results.length; i++) {
    const idx = PATTERN_INDEX_MAP.get(results[i]!.patternId) ?? Infinity;
    if (idx < bestIdx) {
      best = results[i]!;
      bestIdx = idx;
    }
  }

  return {
    pattern: DESTRUCTIVE_PATTERNS[bestIdx]?.pattern ?? (/matched/ as RegExp),
    description: best.description ?? '',
    riskLevel: best.severity === 10 ? 'critical' : 'high',
    category: best.category ?? '',
  };
}

function extractBranch(command: string | undefined): string | null {
  if (!command) return null;
  const match = command.match(/\bgit\s+push\s+\S+\s+(\S+)/);
  return match ? match[1] : null;
}

/** Valid action class prefixes derived from canonical action types. */
const KNOWN_CLASSES = new Set<string>([
  'file',
  'test',
  'git',
  'shell',
  'npm',
  'http',
  'deploy',
  'infra',
  'mcp',
]);

/**
 * Derive the ActionClass from a canonical action type string.
 * e.g., 'file.write' → 'file', 'git.push' → 'git', 'mcp.call' → 'shell' (fallback).
 */
function deriveActionClass(actionType: string): ActionClass {
  const prefix = actionType.split('.')[0] || '';
  if (KNOWN_CLASSES.has(prefix) && prefix !== 'mcp') {
    return prefix as ActionClass;
  }
  // MCP calls and unknown types fall back to 'shell' as the closest class
  return 'shell';
}

export function normalizeIntent(rawAction: RawAgentAction | null): NormalizedIntent {
  if (!rawAction || typeof rawAction !== 'object') {
    return { action: 'unknown', target: '', agent: 'unknown', destructive: false };
  }

  const tool = rawAction.tool || '';
  let action = TOOL_ACTION_MAP[tool] || (tool.startsWith('mcp__') ? 'mcp.call' : 'unknown');
  let target = rawAction.file || rawAction.target || '';

  // For MCP tools, extract the service name from the tool name so policy
  // rules with `target: "service-name"` can match.
  // e.g. "mcp__scheduled-tasks__create_scheduled_task" → "scheduled-tasks"
  if (action === 'mcp.call' && !target && tool.startsWith('mcp__')) {
    const parts = tool.split('__');
    if (parts.length >= 3) {
      target = parts[1];
    }
  }

  if (action === 'shell.exec' && rawAction.command) {
    const gitAction = detectGitAction(rawAction.command);
    if (gitAction) {
      action = gitAction;
      target = extractBranch(rawAction.command) || target;
    } else if (!target) {
      // Use command as target for non-git shell actions so scope-based
      // policy rules can match against the command text.
      target = rawAction.command;
    }
  }

  const agent = rawAction.agent || 'unknown';
  const branch = rawAction.branch || extractBranch(rawAction.command) || undefined;

  // KE-2: Build vendor-neutral ActionContext
  const context: ActionContext = {
    actor: {
      agentId: agent,
      sessionId: (rawAction.metadata?.sessionId as string) || undefined,
      worktree: (rawAction.metadata?.worktree as string) || undefined,
    },
    action: {
      type: action,
      category: deriveActionClass(action),
      originalTool: tool || undefined,
    },
    args: {
      target,
      command: rawAction.command || undefined,
      branch,
    },
    environment: rawAction.metadata?.timestamp
      ? { timestamp: rawAction.metadata.timestamp as number }
      : undefined,
  };

  return {
    action,
    target,
    agent,
    branch,
    command: rawAction.command || undefined,
    filesAffected: rawAction.filesAffected || undefined,
    metadata: rawAction.metadata || undefined,
    persona: rawAction.persona || undefined,
    destructive: action === 'shell.exec' && isDestructiveCommand(rawAction.command || ''),
    context,
  };
}

export function authorize(
  rawAction: RawAgentAction | null,
  policies: LoadedPolicy[],
  evaluateOptions?: EvaluateOptions
): AuthorizationResult {
  const intent = normalizeIntent(rawAction);
  const events: DomainEvent[] = [];

  if (intent.destructive) {
    const result: EvalResult = {
      allowed: false,
      decision: 'deny',
      matchedRule: null,
      matchedPolicy: null,
      reason: `Destructive command detected: ${intent.command}`,
      severity: 5,
    };

    events.push(
      createEvent(UNAUTHORIZED_ACTION, {
        action: intent.action,
        reason: result.reason,
        agentId: intent.agent,
        scope: intent.target,
      })
    );

    return { intent, result, events };
  }

  const result = evaluate(intent, policies, evaluateOptions);

  if (!result.allowed) {
    if (result.matchedPolicy) {
      events.push(
        createEvent(POLICY_DENIED, {
          policy: result.matchedPolicy.id,
          action: intent.action,
          reason: result.reason,
          agentId: intent.agent,
          file: intent.target,
        })
      );
    } else {
      events.push(
        createEvent(UNAUTHORIZED_ACTION, {
          action: intent.action,
          reason: result.reason,
          agentId: intent.agent,
          scope: intent.target,
        })
      );
    }
  }

  // Blast radius computation engine (Phase 2)
  // Computes a weighted score from action type, path sensitivity, and file count,
  // then checks against the tightest policy limit.
  let blastRadius: BlastRadiusResult | undefined;

  let tightestLimit = Infinity;
  for (const policy of policies) {
    for (const rule of policy.rules) {
      if (rule.conditions?.limit !== undefined) {
        tightestLimit = Math.min(tightestLimit, rule.conditions.limit);
      }
    }
  }

  if (tightestLimit < Infinity) {
    blastRadius = computeBlastRadius(intent, tightestLimit);

    if (blastRadius.exceeded) {
      events.push(
        createEvent(BLAST_RADIUS_EXCEEDED, {
          filesAffected: blastRadius.rawCount,
          weightedScore: blastRadius.weightedScore,
          riskLevel: blastRadius.riskLevel,
          factors: blastRadius.factors.map((f) => f.reason),
          limit: tightestLimit,
          action: intent.action,
        })
      );
    }
  }

  return { intent, result, events, blastRadius };
}

export { detectGitAction, isDestructiveCommand, getDestructiveDetails, DESTRUCTIVE_PATTERNS };
