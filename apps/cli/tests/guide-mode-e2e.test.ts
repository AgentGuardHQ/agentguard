// End-to-end integration test: guide mode enforcement flow.
// Validates the full pipeline: YAML policy (mode: guide) → kernel evaluation →
// formatHookResponse with suggestion/correctedCommand → retry tracking.
//
// This test spawns the actual CLI binary (`apps/cli/dist/bin.js claude-hook pre`)
// with a temp directory containing an agentguard.yaml in guide mode.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CLI_BIN = join(__dirname, '..', 'dist', 'bin.js');

// YAML policy: mode: guide with a deny rule that has suggestion + correctedCommand.
// Includes a wildcard allow rule so that non-denied actions (like file.read) pass through.
// Without this, defaultDeny: true (activated when policies are loaded) would block everything.
const GUIDE_POLICY_YAML = `
id: guide-test-policy
name: Guide Mode Test Policy
severity: 4
mode: guide
rules:
  - action: git.push
    effect: deny
    reason: Direct push to main is not allowed — use a feature branch
    suggestion: Push to a feature branch and open a PR instead.
    correctedCommand: git push origin feature-branch
  - action: '*'
    effect: allow
    reason: Allow all other actions
`.trim();

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'ag-guide-e2e-'));

  // Write the policy file
  writeFileSync(join(tmpDir, 'agentguard.yaml'), GUIDE_POLICY_YAML);

  // Write identity file — the hook requires this or it blocks with the identity wizard
  writeFileSync(join(tmpDir, '.agentguard-identity'), 'claude-code:unknown:developer');

  // Initialize a git repo — required for the hook to detect a project root
  execFileSync('git', ['init'], { cwd: tmpDir, stdio: 'ignore' });
});

afterEach(() => {
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
});

/**
 * Run the claude-hook CLI binary with the given JSON payload on stdin.
 * Returns { stdout, exitCode }.
 */
function runHook(payload: Record<string, unknown>): { stdout: string; exitCode: number } {
  const input = JSON.stringify(payload);
  try {
    const stdout = execFileSync('node', [CLI_BIN, 'claude-hook', 'pre'], {
      input,
      encoding: 'utf8',
      cwd: tmpDir,
      env: {
        ...process.env,
        AGENTGUARD_WORKSPACE: tmpDir,
        AGENTGUARD_TELEMETRY: 'off',
        // Clear any session ID that might interfere
        CLAUDE_SESSION_ID: `guide-e2e-${Date.now()}`,
      },
      timeout: 15000,
    });
    return { stdout, exitCode: 0 };
  } catch (err: unknown) {
    const execErr = err as { status: number; stdout: string | Buffer; stderr: string | Buffer };
    return {
      stdout: typeof execErr.stdout === 'string' ? execErr.stdout : String(execErr.stdout ?? ''),
      exitCode: execErr.status ?? 1,
    };
  }
}

describe('Guide mode E2E: full pipeline', () => {
  it('blocks git push with exit code 2 and includes suggestion + correctedCommand', () => {
    const result = runHook({
      hook: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'git push origin main' },
    });

    // Exit code 2 = blocked by PreToolUse hook
    expect(result.exitCode).toBe(2);

    // stdout should be valid JSON
    expect(result.stdout).toBeTruthy();
    const parsed = JSON.parse(result.stdout);

    // Should have hookSpecificOutput with deny decision
    expect(parsed.hookSpecificOutput).toBeDefined();
    expect(parsed.hookSpecificOutput.permissionDecision).toBe('deny');

    // The denial reason should contain the suggestion text from the policy
    const reason: string = parsed.hookSpecificOutput.permissionDecisionReason;
    expect(reason).toBeDefined();
    expect(reason).toContain('Push to a feature branch and open a PR instead.');

    // Should contain the correctedCommand
    expect(reason).toContain('git push origin feature-branch');

    // Should contain retry indicator (attempt 1/3 for first attempt)
    expect(reason).toMatch(/attempt 1\/3/i);
  });

  it('increments retry count across sequential hook calls', () => {
    // Use a stable session ID so retry state persists across calls
    const sessionId = `guide-retry-${Date.now()}`;

    const payload = {
      hook: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'git push origin main' },
      session_id: sessionId,
    };

    // First attempt
    const r1 = runHookWithSession(payload, sessionId);
    expect(r1.exitCode).toBe(2);
    const p1 = JSON.parse(r1.stdout);
    expect(p1.hookSpecificOutput.permissionDecisionReason).toMatch(/attempt 1\/3/i);

    // Second attempt
    const r2 = runHookWithSession(payload, sessionId);
    expect(r2.exitCode).toBe(2);
    const p2 = JSON.parse(r2.stdout);
    expect(p2.hookSpecificOutput.permissionDecisionReason).toMatch(/attempt 2\/3/i);

    // Third attempt
    const r3 = runHookWithSession(payload, sessionId);
    expect(r3.exitCode).toBe(2);
    const p3 = JSON.parse(r3.stdout);
    expect(p3.hookSpecificOutput.permissionDecisionReason).toMatch(/attempt 3\/3/i);
  });

  it('hard-blocks after max retries are exhausted', () => {
    const sessionId = `guide-exhaust-${Date.now()}`;

    const payload = {
      hook: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'git push origin main' },
      session_id: sessionId,
    };

    // Exhaust all 3 retries
    for (let i = 0; i < 3; i++) {
      runHookWithSession(payload, sessionId);
    }

    // Fourth attempt — should get hard block message
    const r4 = runHookWithSession(payload, sessionId);
    expect(r4.exitCode).toBe(2);
    const p4 = JSON.parse(r4.stdout);
    expect(p4.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(p4.hookSpecificOutput.permissionDecisionReason).toContain('correction attempts');
    expect(p4.hookSpecificOutput.permissionDecisionReason).toContain('ask the human');
  });

  it('allows non-denied actions through with exit code 0', () => {
    const result = runHook({
      hook: 'PreToolUse',
      tool_name: 'Read',
      tool_input: { file_path: '/tmp/safe-file.ts' },
    });

    expect(result.exitCode).toBe(0);
  });

  it('includes policy reason in the denial output', () => {
    const result = runHook({
      hook: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'git push origin main' },
    });

    expect(result.exitCode).toBe(2);
    const parsed = JSON.parse(result.stdout);
    const reason: string = parsed.hookSpecificOutput.permissionDecisionReason;

    // Should include the policy rule reason
    expect(reason).toContain('Direct push to main is not allowed');
  });
});

/**
 * Run the hook with an explicit session ID for retry tracking.
 */
function runHookWithSession(
  payload: Record<string, unknown>,
  sessionId: string
): { stdout: string; exitCode: number } {
  const input = JSON.stringify({ ...payload, session_id: sessionId });
  try {
    const stdout = execFileSync('node', [CLI_BIN, 'claude-hook', 'pre'], {
      input,
      encoding: 'utf8',
      cwd: tmpDir,
      env: {
        ...process.env,
        AGENTGUARD_WORKSPACE: tmpDir,
        AGENTGUARD_TELEMETRY: 'off',
        CLAUDE_SESSION_ID: sessionId,
      },
      timeout: 15000,
    });
    return { stdout, exitCode: 0 };
  } catch (err: unknown) {
    const execErr = err as { status: number; stdout: string | Buffer; stderr: string | Buffer };
    return {
      stdout: typeof execErr.stdout === 'string' ? execErr.stdout : String(execErr.stdout ?? ''),
      exitCode: execErr.status ?? 1,
    };
  }
}
