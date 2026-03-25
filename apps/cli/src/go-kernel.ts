// Go kernel fast-path delegation — bypasses the TS kernel for PreToolUse evaluation
// when the Go binary is available. Saves ~280ms per hook call by avoiding Node.js
// module loading and TS kernel construction. Falls back to TS on any failure.
//
// Safety: The Go binary evaluates policy rules only (no invariant checking).
// The fast path is restricted to read-only tools that cannot trigger invariant
// violations. Write/execute tools always go through the full TS kernel.
//
// Closes #955: Go kernel not invoked by claude-hook in v2.7.3

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Tools that are guaranteed read-only and cannot trigger invariant violations.
 * For these tools, Go's policy-only evaluation is sufficient and safe.
 * All 22 built-in invariants check write/execute operations — reads are always safe.
 */
export const GO_FAST_PATH_TOOLS = new Set([
  'Read',
  'Glob',
  'Grep',
  'LS',
  'NotebookRead',
  'ReadMcpResourceTool',
  'ListMcpResourcesTool',
]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Cached Go binary path (resolved once per process). */
let goBinaryCached: string | null | undefined;

/**
 * Resolve the path to the Go kernel binary.
 * Search order:
 * 1. AGENTGUARD_GO_BIN env var (explicit override)
 * 2. Co-located dist/go-bin/ (npm install location)
 * 3. Workspace go/bin/ (dev repo)
 */
export function resolveGoBinary(): string | null {
  if (goBinaryCached !== undefined) return goBinaryCached;

  // 1. Explicit env var
  if (process.env.AGENTGUARD_GO_BIN) {
    goBinaryCached = existsSync(process.env.AGENTGUARD_GO_BIN)
      ? process.env.AGENTGUARD_GO_BIN
      : null;
    return goBinaryCached;
  }

  const binName = process.platform === 'win32' ? 'agentguard-go.exe' : 'agentguard-go';

  // 2. Co-located binary (npm install puts it in dist/go-bin/)
  // __dirname is apps/cli/dist/ or apps/cli/src/ depending on build
  const distGoBin = join(__dirname, '..', 'dist', 'go-bin', binName);
  if (existsSync(distGoBin)) {
    goBinaryCached = distGoBin;
    return goBinaryCached;
  }

  // Also check relative to __dirname directly (when running from dist/)
  const sameLevel = join(__dirname, 'go-bin', binName);
  if (existsSync(sameLevel)) {
    goBinaryCached = sameLevel;
    return goBinaryCached;
  }

  goBinaryCached = null;
  return goBinaryCached;
}

/** Reset the cached binary path (for testing). */
export function resetGoBinaryCache(): void {
  goBinaryCached = undefined;
}

export interface GoEvalResult {
  allowed: boolean;
  reason?: string;
  /** Raw stdout from the Go binary (for debugging). */
  stdout?: string;
}

/**
 * Evaluate a PreToolUse hook action using the Go kernel binary.
 *
 * Sets Claude Code env vars and invokes `agentguard-go claude-hook`.
 * The Go binary reads CLAUDE_TOOL_NAME, CLAUDE_HOOK_EVENT_NAME,
 * CLAUDE_TOOL_INPUT, and CLAUDE_SESSION_ID from the environment.
 * Policy file is passed via AGENTGUARD_POLICY.
 *
 * Exit codes: 0 = allow, 2 = deny, anything else = error (fall back to TS).
 *
 * @returns Evaluation result, or null if Go delegation failed.
 */
export function tryGoEvaluation(
  goBinary: string,
  toolName: string,
  toolInput: Record<string, unknown>,
  sessionId: string | undefined,
  policyPath: string | undefined,
): GoEvalResult | null {
  if (process.env.AGENTGUARD_SKIP_GO === '1') return null;

  try {
    const env: Record<string, string> = {};
    // Copy existing env vars
    for (const [k, v] of Object.entries(process.env)) {
      if (v !== undefined) env[k] = v;
    }
    // Set Claude Code hook env vars
    env.CLAUDE_TOOL_NAME = toolName;
    env.CLAUDE_HOOK_EVENT_NAME = 'PreToolUse';
    env.CLAUDE_TOOL_INPUT = JSON.stringify(toolInput);
    if (sessionId) env.CLAUDE_SESSION_ID = sessionId;
    if (policyPath) env.AGENTGUARD_POLICY = policyPath;

    execFileSync(goBinary, ['claude-hook'], {
      env,
      timeout: 5000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Exit 0 = allow
    return { allowed: true };
  } catch (err: unknown) {
    const execErr = err as { status?: number; stdout?: string; stderr?: string };

    if (execErr.status === 2) {
      // Exit 2 = denied by policy
      const stdout = (execErr.stdout || '') as string;
      let reason = 'Denied by policy';
      try {
        const parsed = JSON.parse(stdout) as {
          hookSpecificOutput?: { permissionDecisionReason?: string };
        };
        if (parsed.hookSpecificOutput?.permissionDecisionReason) {
          reason = parsed.hookSpecificOutput.permissionDecisionReason;
        }
      } catch {
        // Unparseable stdout — use default reason
      }
      return { allowed: false, reason, stdout };
    }

    // Other exit codes or spawn errors — delegation failed, fall back to TS
    return null;
  }
}

/**
 * Lightweight policy file discovery — finds the nearest agentguard.yaml
 * without importing the full policy module.
 *
 * This is intentionally minimal to avoid loading @red-codes/policy (heavy)
 * before we know whether the Go fast path will succeed.
 */
export function findPolicyFileLightweight(targetPath?: string): string | null {
  const candidates = ['agentguard.yaml', 'agentguard.yml'];

  // Walk up from target path if provided
  if (targetPath) {
    let dir = dirname(targetPath);
    const seen = new Set<string>();
    while (!seen.has(dir)) {
      seen.add(dir);
      for (const name of candidates) {
        const candidate = join(dir, name);
        if (existsSync(candidate)) return candidate;
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }

  // Walk up from cwd
  let dir = process.cwd();
  const seen = new Set<string>();
  while (!seen.has(dir)) {
    seen.add(dir);
    for (const name of candidates) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}
