// Tests for `agentguard policy suggest` — local denial-pattern analysis
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { policy } from '../src/commands/policy.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function captureOutput(): {
  stderr: string[];
  stdout: string[];
  restore: () => void;
} {
  const stderr: string[] = [];
  const stdout: string[] = [];
  const origStderr = process.stderr.write.bind(process.stderr);
  const origStdout = process.stdout.write.bind(process.stdout);

  process.stderr.write = (chunk: string | Uint8Array) => {
    stderr.push(typeof chunk === 'string' ? chunk : chunk.toString());
    return true;
  };
  process.stdout.write = (chunk: string | Uint8Array) => {
    stdout.push(typeof chunk === 'string' ? chunk : chunk.toString());
    return true;
  };

  return {
    stderr,
    stdout,
    restore: () => {
      process.stderr.write = origStderr;
      process.stdout.write = origStdout;
    },
  };
}

// ---------------------------------------------------------------------------
// Tests: no SQLite / no data
// ---------------------------------------------------------------------------

describe('policy suggest — no database', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows graceful message when SQLite is unavailable', async () => {
    // Mock @red-codes/storage to throw on createStorageBundle
    vi.doMock('@red-codes/storage', () => ({
      createStorageBundle: async () => {
        throw new Error('better-sqlite3 not available');
      },
      queryEventsByKindAcrossRuns: vi.fn(),
      analyzeDenialPatterns: vi.fn(),
      suggestPolicyChanges: vi.fn(),
    }));

    const { policy: p } = await import('../src/commands/policy.js');
    const cap = captureOutput();
    const code = await p(['suggest']);
    cap.restore();

    expect(code).toBe(0);
    const output = cap.stderr.join('');
    expect(output).toContain('No governance database found');
    expect(output).toContain('agentguard.dev');
  });

  it('shows no-denials message when database has no events', async () => {
    vi.doMock('@red-codes/storage', () => ({
      createStorageBundle: async () => ({
        db: {
          /* fake DB object — queryEventsByKindAcrossRuns will return [] */
        },
        close: () => {},
      }),
      queryEventsByKindAcrossRuns: vi.fn().mockReturnValue([]),
      analyzeDenialPatterns: vi.fn().mockReturnValue({ patterns: [], suggestions: [] }),
      suggestPolicyChanges: vi.fn().mockReturnValue([]),
    }));

    const { policy: p } = await import('../src/commands/policy.js');
    const cap = captureOutput();
    const code = await p(['suggest']);
    cap.restore();

    expect(code).toBe(0);
    const output = cap.stderr.join('');
    expect(output).toContain('No denial events found');
  });
});

// ---------------------------------------------------------------------------
// Tests: routing
// ---------------------------------------------------------------------------

describe('policy suggest — routing', () => {
  it('is routed by the policy command', async () => {
    // policy(['suggest']) should not crash — it's a valid subcommand
    // We just need to confirm it reaches the suggest handler without throwing.
    // Since we have no DB in test environment, we expect code 0 with a message.
    const cap = captureOutput();
    let code: number;
    try {
      code = await policy(['suggest']);
    } catch {
      code = -1;
    } finally {
      cap.restore();
    }
    // Either 0 (graceful no-DB) or a valid exit code — never throws
    expect([0, 1]).toContain(code);
  });

  it('policy help still lists suggest subcommand', async () => {
    const cap = captureOutput();

    // Capture console.log for help output
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));

    const code = await policy(['help']);
    console.log = origLog;
    cap.restore();

    const output = logs.join('\n');
    expect(code).toBe(0);
    expect(output).toContain('suggest');
  });
});
