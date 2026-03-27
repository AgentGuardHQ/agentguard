// Tests for OpenCode adapter
import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeOpenCodeAction,
  formatOpenCodeHookResponse,
  resolveOpenCodeAgentIdentity,
} from '@red-codes/adapters';
import type { OpenCodeHookPayload } from '@red-codes/adapters';
import { createKernel } from '@red-codes/kernel';
import { resetActionCounter } from '@red-codes/core';
import { resetEventCounter } from '@red-codes/events';

beforeEach(() => {
  resetActionCounter();
  resetEventCounter();
});

describe('resolveOpenCodeAgentIdentity', () => {
  it('returns "opencode" when no sessionId', () => {
    expect(resolveOpenCodeAgentIdentity()).toBe('opencode');
    expect(resolveOpenCodeAgentIdentity('')).toBe('opencode');
  });

  it('returns "opencode:<hash>" with a sessionId', () => {
    const result = resolveOpenCodeAgentIdentity('sess-abc-123');
    expect(result).toMatch(/^opencode:[a-z0-9]+$/);
    expect(result).not.toBe('opencode');
  });

  it('produces consistent hashes for the same session ID', () => {
    const a = resolveOpenCodeAgentIdentity('my-session');
    const b = resolveOpenCodeAgentIdentity('my-session');
    expect(a).toBe(b);
  });
});

describe('normalizeOpenCodeAction', () => {
  it('normalizes write_file tool (file.write)', () => {
    const payload: OpenCodeHookPayload = {
      tool: 'write_file',
      input: { path: 'src/test.ts', content: 'hello' },
    };
    const action = normalizeOpenCodeAction(payload);
    expect(action.tool).toBe('Write');
    expect(action.file).toBe('src/test.ts');
    expect(action.content).toBe('hello');
    expect(action.agent).toBe('opencode');
    expect(action.metadata).toMatchObject({ source: 'opencode', hook: 'before' });
  });

  it('normalizes edit_file tool', () => {
    const payload: OpenCodeHookPayload = {
      tool: 'edit_file',
      input: { path: 'src/test.ts', old_content: 'a', new_content: 'b' },
    };
    const action = normalizeOpenCodeAction(payload);
    expect(action.tool).toBe('Edit');
    expect(action.file).toBe('src/test.ts');
    expect(action.content).toBe('b');
  });

  it('normalizes read_file tool (file.read)', () => {
    const payload: OpenCodeHookPayload = {
      tool: 'read_file',
      input: { path: 'README.md' },
    };
    const action = normalizeOpenCodeAction(payload);
    expect(action.tool).toBe('Read');
    expect(action.file).toBe('README.md');
  });

  it('normalizes shell tool (Bash)', () => {
    const payload: OpenCodeHookPayload = {
      tool: 'shell',
      input: { command: 'npm test' },
    };
    const action = normalizeOpenCodeAction(payload);
    expect(action.tool).toBe('Bash');
    expect(action.command).toBe('npm test');
    expect(action.target).toBe('npm test');
  });

  it('normalizes search tool (Grep)', () => {
    const payload: OpenCodeHookPayload = {
      tool: 'search',
      input: { query: 'TODO', path: 'src' },
    };
    const action = normalizeOpenCodeAction(payload);
    expect(action.tool).toBe('Grep');
    expect(action.target).toBe('TODO');
  });

  it('normalizes list_files tool (Glob)', () => {
    const payload: OpenCodeHookPayload = {
      tool: 'list_files',
      input: { pattern: '**/*.ts', path: 'src' },
    };
    const action = normalizeOpenCodeAction(payload);
    expect(action.tool).toBe('Glob');
    expect(action.target).toBe('**/*.ts');
  });

  it('normalizes web_fetch tool', () => {
    const payload: OpenCodeHookPayload = {
      tool: 'web_fetch',
      input: { url: 'https://example.com' },
    };
    const action = normalizeOpenCodeAction(payload);
    expect(action.tool).toBe('WebFetch');
    expect(action.target).toBe('https://example.com');
  });

  it('normalizes task/spawn_agent tool (Agent)', () => {
    const payload: OpenCodeHookPayload = {
      tool: 'task',
      input: { prompt: 'Write unit tests' },
    };
    const action = normalizeOpenCodeAction(payload);
    expect(action.tool).toBe('Agent');
    expect(action.target).toBe('Write unit tests');
  });

  it('passes through unknown tool names', () => {
    const payload: OpenCodeHookPayload = {
      tool: 'unknown_tool',
      input: {},
    };
    const action = normalizeOpenCodeAction(payload);
    expect(action.tool).toBe('unknown_tool');
    expect(action.agent).toBe('opencode');
  });

  it('includes sessionId in agent identity when provided', () => {
    const payload: OpenCodeHookPayload = {
      tool: 'shell',
      input: { command: 'ls' },
      sessionId: 'test-session-42',
    };
    const action = normalizeOpenCodeAction(payload);
    expect(action.agent).toMatch(/^opencode:[a-z0-9]+$/);
  });
});

describe('formatOpenCodeHookResponse', () => {
  it('returns empty string for allowed actions', () => {
    const kernel = createKernel({ runId: 'test', policyDefs: [], dryRun: true });
    const result = { allowed: true, decision: null };
    expect(formatOpenCodeHookResponse(result as Parameters<typeof formatOpenCodeHookResponse>[0])).toBe('');
    kernel.shutdown();
  });

  it('returns JSON deny response for blocked actions', () => {
    const result = {
      allowed: false,
      decision: {
        decision: { reason: 'Protected branch' },
        violations: [],
      },
    };
    const response = formatOpenCodeHookResponse(result as Parameters<typeof formatOpenCodeHookResponse>[0]);
    const parsed = JSON.parse(response) as { decision: string; reason: string };
    expect(parsed.decision).toBe('deny');
    expect(parsed.reason).toContain('Protected branch');
  });

  it('includes violation names in deny response', () => {
    const result = {
      allowed: false,
      decision: {
        decision: { reason: 'Invariant triggered' },
        violations: [{ name: 'No Force Push', invariantId: 'no-force-push' }],
      },
    };
    const response = formatOpenCodeHookResponse(result as Parameters<typeof formatOpenCodeHookResponse>[0]);
    const parsed = JSON.parse(response) as { decision: string; reason: string };
    expect(parsed.reason).toContain('No Force Push');
  });

  it('returns empty string in educate mode (allow with stderr)', () => {
    const result = { allowed: false, decision: null };
    const suggestion = { message: 'Use a feature branch instead' };
    const response = formatOpenCodeHookResponse(
      result as Parameters<typeof formatOpenCodeHookResponse>[0],
      suggestion as Parameters<typeof formatOpenCodeHookResponse>[1],
      { mode: 'educate' }
    );
    expect(response).toBe('');
  });
});

describe('OpenCode adapter integration', () => {
  it('processOpenCodeHook allows safe actions', async () => {
    const { processOpenCodeHook } = await import('@red-codes/adapters');
    const kernel = createKernel({
      runId: 'test-opencode',
      policyDefs: [],
      dryRun: true,
      evaluateOptions: { defaultDeny: false },
    });

    const payload: OpenCodeHookPayload = {
      tool: 'read_file',
      input: { path: 'README.md' },
      sessionId: 'test-session',
    };

    const result = await processOpenCodeHook(kernel, payload);
    expect(result.allowed).toBe(true);
    kernel.shutdown();
  });

  it('processOpenCodeHook respects deny policies', async () => {
    const { processOpenCodeHook } = await import('@red-codes/adapters');
    const kernel = createKernel({
      runId: 'test-opencode-deny',
      policyDefs: [
        {
          id: 'test-policy',
          rules: [
            {
              action: 'file.write',
              effect: 'deny',
              target: '.env',
              reason: 'Secrets file protected',
            },
          ],
        },
      ],
      dryRun: true,
    });

    const payload: OpenCodeHookPayload = {
      tool: 'write_file',
      input: { path: '.env', content: 'SECRET=value' },
    };

    const result = await processOpenCodeHook(kernel, payload);
    expect(result.allowed).toBe(false);
    kernel.shutdown();
  });
});
