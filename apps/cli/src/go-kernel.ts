/**
 * Go kernel bridge — detects and delegates to the Go binary for fast policy evaluation.
 *
 * The Go binary evaluates policies in ~2-3ms vs ~290ms for the TS kernel path.
 * The TS layer pre-resolves pack: references and YAML policy files into flat JSON rules
 * before handing off to Go — this fixes #957 where Go would return "default deny" for
 * all actions when given a policy file that uses unresolved pack: references.
 *
 * Binary lookup order:
 *  1. AGENTGUARD_GO_BIN env var (explicit override)
 *  2. dist/go-bin/agentguard-go  (installed via postinstall next to bin.js)
 *  3. go/bin/agentguard           (dev workspace — built locally with `go build`)
 */

import { existsSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { LoadedPolicy } from '@red-codes/policy';
import type { ClaudeCodeHookPayload } from '@red-codes/adapters';

// __dirname resolves to dist/ at runtime and src/ during vitest (both work correctly).
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Locate the Go kernel binary. Returns the absolute path or null if not found.
 */
export function findGoBinary(): string | null {
  const envBin = process.env.AGENTGUARD_GO_BIN;
  if (envBin) return existsSync(envBin) ? envBin : null;

  const binName = process.platform === 'win32' ? 'agentguard-go.exe' : 'agentguard-go';

  // dist/go-bin/agentguard-go — installed by postinstall script next to bin.js
  const distBin = join(__dirname, 'go-bin', binName);
  if (existsSync(distBin)) return distBin;

  // go/bin/agentguard — dev workspace binary built locally
  const devBin = join(__dirname, '..', '..', '..', 'go', 'bin', 'agentguard');
  if (existsSync(devBin)) return devBin;

  return null;
}

/**
 * Serialize pre-resolved policyDefs to JSON for Go's policy loader.
 *
 * Go's LoadYamlPolicy accepts JSON (JSON is valid YAML) and uses the same
 * LoadedPolicy struct layout as the TS type. Multiple policies are merged
 * into a single synthetic policy with combined rules so Go's single-file
 * policy loader sees the full rule set.
 *
 * Merge strategy:
 *  - rules:              concatenated in policy order
 *  - mode:               strictest (enforce > guide > educate > monitor)
 *  - disabledInvariants: union of all disabled IDs
 *  - severity:           maximum value
 */
export function serializePoliciesForGo(policyDefs: LoadedPolicy[]): string {
  if (policyDefs.length === 0) {
    return JSON.stringify({ id: 'empty', name: 'empty', rules: [], severity: 0 });
  }

  if (policyDefs.length === 1) {
    // Single policy — strip TS-only fields that Go doesn't understand
    const { pack: _pack, agentguardVersion: _av, persona: _p, ...rest } =
      policyDefs[0] as LoadedPolicy & {
        pack?: string;
        agentguardVersion?: string;
        persona?: unknown;
      };
    return JSON.stringify(rest);
  }

  // Multiple policies — merge into one for Go's single-file loader
  const modeOrder = { enforce: 3, guide: 2, educate: 1, monitor: 0 } as const;
  type Mode = keyof typeof modeOrder;

  let mode: Mode = 'monitor';
  const disabledInvariants = new Set<string>();
  let severity = 0;
  const rules: LoadedPolicy['rules'] = [];

  for (const p of policyDefs) {
    const pMode = p.mode as Mode | undefined;
    if (pMode && modeOrder[pMode] !== undefined && modeOrder[pMode] > modeOrder[mode]) {
      mode = pMode;
    }
    for (const id of p.disabledInvariants ?? []) disabledInvariants.add(id);
    if (p.severity > severity) severity = p.severity;
    rules.push(...p.rules);
  }

  return JSON.stringify({
    id: 'merged',
    name: 'Merged pre-resolved policy',
    mode,
    severity,
    disabledInvariants: [...disabledInvariants],
    rules,
  });
}

/**
 * Delegate hook evaluation to the Go binary.
 *
 * Writes the pre-resolved policy JSON to a temp file, sets AGENTGUARD_POLICY so
 * Go's FindPolicyFile picks it up (bypassing the raw agentguard.yaml that has
 * unresolved pack: references), then invokes `agentguard claude-hook` with the
 * hook payload on stdin.
 *
 * Returns null on any error so the caller falls back to the TS kernel.
 * The caller should log a fallback message before continuing.
 */
export function delegateToGoHook(
  goBin: string,
  policyDefs: LoadedPolicy[],
  payload: ClaudeCodeHookPayload
): { denied: boolean; response: string } | null {
  let tempPolicyPath: string | null = null;
  try {
    const policyJson = serializePoliciesForGo(policyDefs);
    const dir = join(tmpdir(), 'agentguard');
    mkdirSync(dir, { recursive: true });
    tempPolicyPath = join(dir, `policy-go-${randomUUID()}.json`);
    writeFileSync(tempPolicyPath, policyJson, 'utf8');

    const result = spawnSync(goBin, ['claude-hook'], {
      input: JSON.stringify(payload),
      encoding: 'utf8',
      env: {
        ...process.env,
        // Override policy path so Go reads pre-resolved flat rules (#957)
        AGENTGUARD_POLICY: tempPolicyPath,
      },
      timeout: 5000,
    });

    // Binary not found, EPERM, ENOMEM, etc.
    if (result.error) return null;
    // Exit code 0 = allow, 2 = deny; anything else is an unexpected error
    if (result.status !== 0 && result.status !== 2) return null;

    return {
      denied: result.status === 2,
      response: result.stdout ?? '',
    };
  } catch {
    return null;
  } finally {
    if (tempPolicyPath) {
      try {
        unlinkSync(tempPolicyPath);
      } catch {
        // Non-fatal — OS will clean up tmpdir eventually
      }
    }
  }
}
