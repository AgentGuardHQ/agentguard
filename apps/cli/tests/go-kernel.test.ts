// Tests for Go kernel fast-path delegation (#955).
// Verifies binary detection, evaluation delegation, and fallback behavior.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import {
  resolveGoBinary,
  resetGoBinaryCache,
  tryGoEvaluation,
  findPolicyFileLightweight,
  GO_FAST_PATH_TOOLS,
} from '../src/go-kernel.js';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

vi.mock('node:fs', async (importOriginal) => {
  const original = (await importOriginal()) as typeof import('node:fs');
  return {
    ...original,
    existsSync: vi.fn(),
  };
});

const mockExecFileSync = vi.mocked(execFileSync);
const mockExistsSync = vi.mocked(existsSync);

beforeEach(() => {
  vi.clearAllMocks();
  resetGoBinaryCache();
  delete process.env.AGENTGUARD_GO_BIN;
  delete process.env.AGENTGUARD_SKIP_GO;
});

describe('resolveGoBinary', () => {
  it('returns AGENTGUARD_GO_BIN when set and file exists', () => {
    process.env.AGENTGUARD_GO_BIN = '/usr/local/bin/agentguard-go';
    mockExistsSync.mockReturnValue(true);

    expect(resolveGoBinary()).toBe('/usr/local/bin/agentguard-go');
  });

  it('returns null when AGENTGUARD_GO_BIN points to missing file', () => {
    process.env.AGENTGUARD_GO_BIN = '/nonexistent/agentguard-go';
    mockExistsSync.mockReturnValue(false);

    expect(resolveGoBinary()).toBeNull();
  });

  it('caches the result across calls', () => {
    process.env.AGENTGUARD_GO_BIN = '/usr/local/bin/agentguard-go';
    mockExistsSync.mockReturnValue(true);

    resolveGoBinary();
    resolveGoBinary();

    // existsSync called only once due to caching
    expect(mockExistsSync).toHaveBeenCalledTimes(1);
  });

  it('returns null when no binary found', () => {
    mockExistsSync.mockReturnValue(false);

    expect(resolveGoBinary()).toBeNull();
  });

  it('finds co-located binary in dist/go-bin/', () => {
    mockExistsSync.mockImplementation((p: unknown) => {
      return typeof p === 'string' && p.includes('go-bin/agentguard-go');
    });

    const result = resolveGoBinary();
    expect(result).toMatch(/go-bin\/agentguard-go/);
  });
});

describe('tryGoEvaluation', () => {
  const goBinary = '/usr/local/bin/agentguard-go';
  const defaultArgs = {
    toolName: 'Bash',
    toolInput: { command: 'ls -la' },
    sessionId: 'test-session-123',
    policyPath: '/project/agentguard.yaml',
  };

  it('returns allowed=true when Go exits 0', () => {
    mockExecFileSync.mockReturnValue('');

    const result = tryGoEvaluation(
      goBinary,
      defaultArgs.toolName,
      defaultArgs.toolInput,
      defaultArgs.sessionId,
      defaultArgs.policyPath,
    );

    expect(result).toEqual({ allowed: true });
  });

  it('passes correct env vars to Go binary', () => {
    mockExecFileSync.mockReturnValue('');

    tryGoEvaluation(
      goBinary,
      defaultArgs.toolName,
      defaultArgs.toolInput,
      defaultArgs.sessionId,
      defaultArgs.policyPath,
    );

    expect(mockExecFileSync).toHaveBeenCalledWith(
      goBinary,
      ['claude-hook'],
      expect.objectContaining({
        env: expect.objectContaining({
          CLAUDE_TOOL_NAME: 'Bash',
          CLAUDE_HOOK_EVENT_NAME: 'PreToolUse',
          CLAUDE_TOOL_INPUT: JSON.stringify({ command: 'ls -la' }),
          CLAUDE_SESSION_ID: 'test-session-123',
          AGENTGUARD_POLICY: '/project/agentguard.yaml',
        }),
        timeout: 5000,
      }),
    );
  });

  it('returns allowed=false with reason when Go exits 2 (denied)', () => {
    const denyOutput = JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: 'Direct push to protected branch',
      },
    });

    const error = Object.assign(new Error('exit 2'), {
      status: 2,
      stdout: denyOutput,
      stderr: '',
    });
    mockExecFileSync.mockImplementation(() => {
      throw error;
    });

    const result = tryGoEvaluation(
      goBinary,
      'Bash',
      { command: 'git push origin main' },
      'session-1',
      '/project/agentguard.yaml',
    );

    expect(result).toEqual({
      allowed: false,
      reason: 'Direct push to protected branch',
      stdout: denyOutput,
    });
  });

  it('returns allowed=false with default reason when Go exits 2 with unparseable stdout', () => {
    const error = Object.assign(new Error('exit 2'), {
      status: 2,
      stdout: 'not json',
      stderr: '',
    });
    mockExecFileSync.mockImplementation(() => {
      throw error;
    });

    const result = tryGoEvaluation(
      goBinary,
      'Bash',
      { command: 'git push origin main' },
      'session-1',
      undefined,
    );

    expect(result).toEqual({
      allowed: false,
      reason: 'Denied by policy',
      stdout: 'not json',
    });
  });

  it('returns null on Go binary crash (exit 1)', () => {
    const error = Object.assign(new Error('exit 1'), {
      status: 1,
      stdout: '',
      stderr: 'internal error',
    });
    mockExecFileSync.mockImplementation(() => {
      throw error;
    });

    const result = tryGoEvaluation(
      goBinary,
      defaultArgs.toolName,
      defaultArgs.toolInput,
      defaultArgs.sessionId,
      defaultArgs.policyPath,
    );

    expect(result).toBeNull();
  });

  it('returns null on timeout', () => {
    const error = Object.assign(new Error('ETIMEDOUT'), {
      status: null,
      killed: true,
    });
    mockExecFileSync.mockImplementation(() => {
      throw error;
    });

    const result = tryGoEvaluation(
      goBinary,
      defaultArgs.toolName,
      defaultArgs.toolInput,
      defaultArgs.sessionId,
      defaultArgs.policyPath,
    );

    expect(result).toBeNull();
  });

  it('returns null when AGENTGUARD_SKIP_GO=1', () => {
    process.env.AGENTGUARD_SKIP_GO = '1';

    const result = tryGoEvaluation(
      goBinary,
      defaultArgs.toolName,
      defaultArgs.toolInput,
      defaultArgs.sessionId,
      defaultArgs.policyPath,
    );

    expect(result).toBeNull();
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('omits CLAUDE_SESSION_ID when sessionId is undefined', () => {
    mockExecFileSync.mockReturnValue('');

    tryGoEvaluation(goBinary, 'Read', { file_path: '/foo' }, undefined, undefined);

    const envArg = mockExecFileSync.mock.calls[0][2] as { env: Record<string, string> };
    expect(envArg.env.CLAUDE_SESSION_ID).toBeUndefined();
  });

  it('omits AGENTGUARD_POLICY when policyPath is undefined', () => {
    mockExecFileSync.mockReturnValue('');

    tryGoEvaluation(goBinary, 'Read', { file_path: '/foo' }, 'sess', undefined);

    const envArg = mockExecFileSync.mock.calls[0][2] as { env: Record<string, string> };
    expect(envArg.env.AGENTGUARD_POLICY).toBeUndefined();
  });
});

describe('findPolicyFileLightweight', () => {
  afterEach(() => {
    mockExistsSync.mockReset();
  });

  it('finds agentguard.yaml walking up from target path', () => {
    mockExistsSync.mockImplementation((p: unknown) => {
      return p === '/home/user/project/agentguard.yaml';
    });

    const result = findPolicyFileLightweight('/home/user/project/src/main.ts');
    expect(result).toBe('/home/user/project/agentguard.yaml');
  });

  it('returns null when no policy file found', () => {
    mockExistsSync.mockReturnValue(false);

    const result = findPolicyFileLightweight('/tmp/no-project/file.ts');
    expect(result).toBeNull();
  });

  it('prefers agentguard.yaml over agentguard.yml', () => {
    const found = new Set(['/project/agentguard.yaml']);
    mockExistsSync.mockImplementation((p: unknown) => found.has(p as string));

    const result = findPolicyFileLightweight('/project/src/file.ts');
    expect(result).toBe('/project/agentguard.yaml');
  });
});

describe('GO_FAST_PATH_TOOLS', () => {
  it('includes read-only tools', () => {
    expect(GO_FAST_PATH_TOOLS.has('Read')).toBe(true);
    expect(GO_FAST_PATH_TOOLS.has('Glob')).toBe(true);
    expect(GO_FAST_PATH_TOOLS.has('Grep')).toBe(true);
    expect(GO_FAST_PATH_TOOLS.has('LS')).toBe(true);
  });

  it('excludes write/execute tools', () => {
    expect(GO_FAST_PATH_TOOLS.has('Write')).toBe(false);
    expect(GO_FAST_PATH_TOOLS.has('Edit')).toBe(false);
    expect(GO_FAST_PATH_TOOLS.has('Bash')).toBe(false);
  });
});
