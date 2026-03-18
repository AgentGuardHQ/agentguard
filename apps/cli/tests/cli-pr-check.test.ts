// Tests for the agentguard pr-check CLI command
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

vi.mock('../src/policy-resolver.js', () => ({
  loadComposedPolicies: vi.fn(),
  findDefaultPolicy: vi.fn(),
}));

import { parseDiffStat, diffEntriesToActions, prCheck } from '../src/commands/pr-check.js';
import { execFileSync } from 'node:child_process';
import { loadComposedPolicies, findDefaultPolicy } from '../src/policy-resolver.js';
import type { LoadedPolicy } from '@red-codes/policy';

// ---------------------------------------------------------------------------
// parseDiffStat — pure function tests (no mocks needed)
// ---------------------------------------------------------------------------

describe('parseDiffStat', () => {
  it('parses added files', () => {
    const diff = `diff --git a/src/new-file.ts b/src/new-file.ts
new file mode 100644
index 0000000..abc1234
--- /dev/null
+++ b/src/new-file.ts
@@ -0,0 +1,5 @@
+export const x = 1;`;

    const entries = parseDiffStat(diff);
    expect(entries).toEqual([{ file: 'src/new-file.ts', status: 'added' }]);
  });

  it('parses modified files', () => {
    const diff = `diff --git a/src/existing.ts b/src/existing.ts
index abc1234..def5678 100644
--- a/src/existing.ts
+++ b/src/existing.ts
@@ -1,3 +1,4 @@
 export const x = 1;
+export const y = 2;`;

    const entries = parseDiffStat(diff);
    expect(entries).toEqual([{ file: 'src/existing.ts', status: 'modified' }]);
  });

  it('parses deleted files', () => {
    const diff = `diff --git a/src/old-file.ts b/src/old-file.ts
deleted file mode 100644
index abc1234..0000000
--- a/src/old-file.ts
+++ /dev/null
@@ -1,3 +0,0 @@
-export const x = 1;`;

    const entries = parseDiffStat(diff);
    expect(entries).toEqual([{ file: 'src/old-file.ts', status: 'deleted' }]);
  });

  it('parses renamed files', () => {
    const diff = `diff --git a/src/old-name.ts b/src/new-name.ts
similarity index 95%
rename from src/old-name.ts
rename to src/new-name.ts
index abc1234..def5678 100644`;

    const entries = parseDiffStat(diff);
    expect(entries).toEqual([{ file: 'src/new-name.ts', status: 'renamed' }]);
  });

  it('parses multiple files in a single diff', () => {
    const diff = `diff --git a/src/a.ts b/src/a.ts
new file mode 100644
index 0000000..abc1234
--- /dev/null
+++ b/src/a.ts
@@ -0,0 +1 @@
+export const a = 1;
diff --git a/src/b.ts b/src/b.ts
index abc1234..def5678 100644
--- a/src/b.ts
+++ b/src/b.ts
@@ -1 +1,2 @@
 export const b = 1;
+export const b2 = 2;
diff --git a/src/c.ts b/src/c.ts
deleted file mode 100644
index abc1234..0000000
--- a/src/c.ts
+++ /dev/null
@@ -1 +0,0 @@
-export const c = 1;`;

    const entries = parseDiffStat(diff);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({ file: 'src/a.ts', status: 'added' });
    expect(entries[1]).toEqual({ file: 'src/b.ts', status: 'modified' });
    expect(entries[2]).toEqual({ file: 'src/c.ts', status: 'deleted' });
  });

  it('deduplicates files appearing multiple times', () => {
    const diff = `diff --git a/src/a.ts b/src/a.ts
index abc1234..def5678 100644
--- a/src/a.ts
+++ b/src/a.ts
@@ -1 +1,2 @@
+line
diff --git a/src/a.ts b/src/a.ts
index def5678..ghi9012 100644`;

    const entries = parseDiffStat(diff);
    expect(entries).toHaveLength(1);
  });

  it('returns empty array for empty diff', () => {
    expect(parseDiffStat('')).toEqual([]);
    expect(parseDiffStat('no diff here')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// diffEntriesToActions — pure function tests
// ---------------------------------------------------------------------------

describe('diffEntriesToActions', () => {
  it('converts added files to Write actions', () => {
    const actions = diffEntriesToActions([{ file: 'src/new.ts', status: 'added' }]);
    expect(actions).toEqual([{ tool: 'Write', file: 'src/new.ts', agent: 'pr-check' }]);
  });

  it('converts modified files to Write actions', () => {
    const actions = diffEntriesToActions([{ file: 'src/mod.ts', status: 'modified' }]);
    expect(actions).toEqual([{ tool: 'Write', file: 'src/mod.ts', agent: 'pr-check' }]);
  });

  it('converts deleted files to Bash rm actions', () => {
    const actions = diffEntriesToActions([{ file: 'src/old.ts', status: 'deleted' }]);
    expect(actions).toEqual([
      { tool: 'Bash', command: 'rm src/old.ts', file: 'src/old.ts', agent: 'pr-check' },
    ]);
  });

  it('converts renamed files to Write actions', () => {
    const actions = diffEntriesToActions([{ file: 'src/renamed.ts', status: 'renamed' }]);
    expect(actions).toEqual([{ tool: 'Write', file: 'src/renamed.ts', agent: 'pr-check' }]);
  });

  it('adds npm install action for package.json changes', () => {
    const actions = diffEntriesToActions([{ file: 'package.json', status: 'modified' }]);
    expect(actions).toHaveLength(2);
    expect(actions[0]).toEqual({ tool: 'Write', file: 'package.json', agent: 'pr-check' });
    expect(actions[1]).toEqual({
      tool: 'Bash',
      command: 'npm install',
      agent: 'pr-check',
      metadata: { source: 'dependency-change', file: 'package.json' },
    });
  });

  it('adds npm install for nested package.json', () => {
    const actions = diffEntriesToActions([
      { file: 'packages/core/package.json', status: 'modified' },
    ]);
    expect(actions).toHaveLength(2);
    expect(actions[1].command).toBe('npm install');
  });

  it('does not add npm install for deleted package.json', () => {
    const actions = diffEntriesToActions([{ file: 'package.json', status: 'deleted' }]);
    expect(actions).toHaveLength(1);
    expect(actions[0].tool).toBe('Bash');
    expect(actions[0].command).toContain('rm');
  });
});

// ---------------------------------------------------------------------------
// prCheck CLI — integration tests with mocked externals
// ---------------------------------------------------------------------------

const SAMPLE_DIFF = `diff --git a/src/app.ts b/src/app.ts
index abc1234..def5678 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,3 +1,4 @@
 export const x = 1;
+export const y = 2;
diff --git a/.env b/.env
new file mode 100644
index 0000000..abc1234
--- /dev/null
+++ b/.env
@@ -0,0 +1 @@
+SECRET=abc123`;

const ALLOW_ALL_POLICY: LoadedPolicy = {
  id: 'test-allow',
  name: 'Test Allow All',
  rules: [{ action: '*', effect: 'allow' }],
  severity: 1,
};

const DENY_ENV_POLICY: LoadedPolicy = {
  id: 'test-deny-env',
  name: 'Test Deny Env',
  rules: [
    { action: 'file.write', effect: 'deny', conditions: { scope: ['*.env', '.env'] }, reason: 'Credential files blocked' },
    { action: '*', effect: 'allow' },
  ],
  severity: 4,
};

describe('prCheck', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default: no PR auto-detection
    vi.mocked(execFileSync).mockImplementation((cmd: string, args?: readonly string[]) => {
      const argList = args as string[];
      if (cmd === 'gh' && argList?.[0] === 'pr' && argList?.[1] === 'view') {
        throw new Error('no PR');
      }
      if (cmd === 'gh' && argList?.[0] === 'pr' && argList?.[1] === 'diff') {
        return SAMPLE_DIFF;
      }
      return '';
    });
  });

  it('passes when all actions are allowed', async () => {
    vi.mocked(loadComposedPolicies).mockReturnValue({
      policies: [ALLOW_ALL_POLICY],
      sources: [],
      description: '',
    });
    vi.mocked(execFileSync).mockImplementation((cmd: string, args?: readonly string[]) => {
      const argList = args as string[];
      if (cmd === 'gh' && argList?.[0] === 'pr' && argList?.[1] === 'diff') {
        return SAMPLE_DIFF;
      }
      throw new Error('not found');
    });

    const code = await prCheck(['--pr', '42']);
    expect(code).toBe(0);
  });

  it('fails when actions are denied', async () => {
    vi.mocked(loadComposedPolicies).mockReturnValue({
      policies: [DENY_ENV_POLICY],
      sources: [],
      description: '',
    });
    vi.mocked(execFileSync).mockImplementation((cmd: string, args?: readonly string[]) => {
      const argList = args as string[];
      if (cmd === 'gh' && argList?.[0] === 'pr' && argList?.[1] === 'diff') {
        return SAMPLE_DIFF;
      }
      throw new Error('not found');
    });

    const code = await prCheck(['--pr', '42']);
    expect(code).toBe(1);
  });

  it('passes with --warn-only even when violations exist', async () => {
    vi.mocked(loadComposedPolicies).mockReturnValue({
      policies: [DENY_ENV_POLICY],
      sources: [],
      description: '',
    });
    vi.mocked(execFileSync).mockImplementation((cmd: string, args?: readonly string[]) => {
      const argList = args as string[];
      if (cmd === 'gh' && argList?.[0] === 'pr' && argList?.[1] === 'diff') {
        return SAMPLE_DIFF;
      }
      throw new Error('not found');
    });

    const code = await prCheck(['--pr', '42', '--warn-only']);
    expect(code).toBe(0);
  });

  it('outputs JSON when --json flag is set', async () => {
    vi.mocked(loadComposedPolicies).mockReturnValue({
      policies: [ALLOW_ALL_POLICY],
      sources: [],
      description: '',
    });
    vi.mocked(execFileSync).mockImplementation((cmd: string, args?: readonly string[]) => {
      const argList = args as string[];
      if (cmd === 'gh' && argList?.[0] === 'pr' && argList?.[1] === 'diff') {
        return SAMPLE_DIFF;
      }
      throw new Error('not found');
    });

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    const code = await prCheck(['--pr', '42', '--json']);
    expect(code).toBe(0);

    const jsonCalls = stdoutSpy.mock.calls.filter((c) => {
      try {
        JSON.parse(c[0] as string);
        return true;
      } catch {
        return false;
      }
    });
    expect(jsonCalls.length).toBeGreaterThan(0);

    const result = JSON.parse(jsonCalls[0][0] as string);
    expect(result.pr).toBe(42);
    expect(result.pass).toBe(true);
    expect(result.totalFiles).toBe(2);

    stdoutSpy.mockRestore();
  });

  it('returns error when PR diff not available', async () => {
    vi.mocked(loadComposedPolicies).mockReturnValue({
      policies: [ALLOW_ALL_POLICY],
      sources: [],
      description: '',
    });
    vi.mocked(execFileSync).mockImplementation(() => {
      throw new Error('no PR');
    });

    const code = await prCheck(['--pr', '99']);
    expect(code).toBe(1);
  });

  it('returns error for non-numeric PR number', async () => {
    const code = await prCheck(['--pr', 'abc']);
    expect(code).toBe(1);
  });

  it('returns 0 when no policy file found', async () => {
    vi.mocked(loadComposedPolicies).mockReturnValue({
      policies: [],
      sources: [],
      description: '',
    });
    vi.mocked(findDefaultPolicy).mockReturnValue(null);

    const code = await prCheck(['--pr', '42']);
    expect(code).toBe(0);
  });
});
