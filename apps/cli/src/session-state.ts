/**
 * Cross-invocation session state for AgentGuard hooks.
 *
 * Each Claude Code session is stateless per hook call. We bridge this by writing
 * a small JSON file keyed by session_id so format/test results from one call are
 * visible to subsequent PreToolUse governance checks in the same session.
 *
 * The subdirectory (tmpdir/agentguard/) reduces path predictability on shared
 * systems compared to a flat tmpdir file.
 */

import { join } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

export interface SessionState extends Record<string, unknown> {
  formatPass?: boolean;
  testsPass?: boolean;
}

export function sessionStatePath(sessionId: string): string {
  return join(tmpdir(), 'agentguard', `session-${sessionId}.json`);
}

export function readSessionState(sessionId: string | undefined): SessionState {
  const key = sessionId || String(process.ppid) || 'default';
  try {
    return JSON.parse(readFileSync(sessionStatePath(key), 'utf8')) as SessionState;
  } catch {
    return {};
  }
}

export function writeSessionState(
  sessionId: string | undefined,
  patch: Partial<SessionState>
): void {
  const key = sessionId || String(process.ppid) || 'default';
  try {
    mkdirSync(join(tmpdir(), 'agentguard'), { recursive: true });
    const current = readSessionState(key);
    writeFileSync(sessionStatePath(key), JSON.stringify({ ...current, ...patch }));
  } catch {
    // Non-fatal — state tracking is best-effort
  }
}
