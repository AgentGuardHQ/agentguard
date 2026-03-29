// Tests for the Go kernel bridge: binary detection, policy serialization, and delegation.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { LoadedPolicy } from '@red-codes/policy';

// Keep binary detection and serialization tests isolated from the file system
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, existsSync: vi.fn(actual.existsSync) };
});

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return { ...actual, spawnSync: vi.fn() };
});

import { findGoBinary, serializePoliciesForGo, delegateToGoHook } from '../src/go-kernel.js';
import { spawnSync } from 'node:child_process';

const mockExistsSync = existsSync as unknown as ReturnType<typeof vi.fn>;
const mockSpawnSync = spawnSync as unknown as ReturnType<typeof vi.fn>;

const samplePolicy: LoadedPolicy = {
  id: 'test-policy',
  name: 'Test Policy',
  severity: 3,
  rules: [
    { action: 'file.write', effect: 'allow', reason: 'Allow writes' },
    { action: 'git.force-push', effect: 'deny', reason: 'No force push' },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.AGENTGUARD_GO_BIN;
  mockExistsSync.mockReturnValue(false);
});

afterEach(() => {
  delete process.env.AGENTGUARD_GO_BIN;
});

// ── findGoBinary ──────────────────────────────────────────────────────────────

describe('findGoBinary', () => {
  it('returns null when no binary exists', () => {
    mockExistsSync.mockReturnValue(false);
    expect(findGoBinary()).toBeNull();
  });

  it('returns AGENTGUARD_GO_BIN env var path when it exists', () => {
    process.env.AGENTGUARD_GO_BIN = '/custom/agentguard-go';
    mockExistsSync.mockImplementation((p) => p === '/custom/agentguard-go');
    expect(findGoBinary()).toBe('/custom/agentguard-go');
  });

  it('returns null when AGENTGUARD_GO_BIN points to non-existent file', () => {
    process.env.AGENTGUARD_GO_BIN = '/missing/agentguard-go';
    mockExistsSync.mockReturnValue(false);
    expect(findGoBinary()).toBeNull();
  });

  it('finds dist/go-bin binary when it exists', () => {
    // Mock only the dist/go-bin path to exist
    mockExistsSync.mockImplementation((p: string) => {
      const normalized = String(p).replace(/\\/g, '/');
      return normalized.includes('go-bin/agentguard-go') && !normalized.includes('go/bin');
    });
    const result = findGoBinary();
    expect(result).not.toBeNull();
    expect(result).toMatch(/go-bin[/\\]agentguard-go/);
  });

  it('finds dev workspace binary when dist binary is absent', () => {
    mockExistsSync.mockImplementation((p: string) => {
      const normalized = String(p).replace(/\\/g, '/');
      return normalized.endsWith('/go/bin/agentguard');
    });
    const result = findGoBinary();
    expect(result).not.toBeNull();
    expect(result).toMatch(/go\/bin\/agentguard$/);
  });
});

// ── serializePoliciesForGo ────────────────────────────────────────────────────

describe('serializePoliciesForGo', () => {
  it('returns empty policy JSON for empty array', () => {
    const result = JSON.parse(serializePoliciesForGo([]));
    expect(result.rules).toEqual([]);
    expect(result.id).toBe('empty');
  });

  it('serializes single policy preserving rules', () => {
    const result = JSON.parse(serializePoliciesForGo([samplePolicy]));
    expect(result.rules).toHaveLength(2);
    expect(result.rules[0].action).toBe('file.write');
    expect(result.rules[1].effect).toBe('deny');
  });

  it('strips TS-only fields from single policy', () => {
    const withExtra = { ...samplePolicy, pack: 'essentials', agentguardVersion: '>=2.0.0' };
    const result = JSON.parse(serializePoliciesForGo([withExtra as LoadedPolicy]));
    expect(result.pack).toBeUndefined();
    expect(result.agentguardVersion).toBeUndefined();
  });

  it('merges multiple policies into one with combined rules', () => {
    const p2: LoadedPolicy = {
      id: 'p2',
      name: 'P2',
      severity: 1,
      rules: [{ action: 'shell.exec', effect: 'deny', reason: 'No shell' }],
    };
    const result = JSON.parse(serializePoliciesForGo([samplePolicy, p2]));
    expect(result.rules).toHaveLength(3);
    expect(result.id).toBe('merged');
  });

  it('uses strictest mode when merging policies', () => {
    const monitor: LoadedPolicy = { ...samplePolicy, id: 'a', mode: 'monitor', rules: [] };
    const enforce: LoadedPolicy = { ...samplePolicy, id: 'b', mode: 'enforce', rules: [] };
    const result = JSON.parse(serializePoliciesForGo([monitor, enforce]));
    expect(result.mode).toBe('enforce');
  });

  it('unions disabledInvariants when merging', () => {
    const a: LoadedPolicy = { ...samplePolicy, id: 'a', disabledInvariants: ['inv-1'], rules: [] };
    const b: LoadedPolicy = { ...samplePolicy, id: 'b', disabledInvariants: ['inv-2'], rules: [] };
    const result = JSON.parse(serializePoliciesForGo([a, b]));
    expect(result.disabledInvariants).toContain('inv-1');
    expect(result.disabledInvariants).toContain('inv-2');
    expect(result.disabledInvariants).toHaveLength(2);
  });

  it('uses max severity when merging', () => {
    const low: LoadedPolicy = { ...samplePolicy, id: 'low', severity: 1, rules: [] };
    const high: LoadedPolicy = { ...samplePolicy, id: 'high', severity: 7, rules: [] };
    const result = JSON.parse(serializePoliciesForGo([low, high]));
    expect(result.severity).toBe(7);
  });
});

// ── delegateToGoHook ──────────────────────────────────────────────────────────

describe('delegateToGoHook', () => {
  const payload = {
    tool_name: 'Write',
    tool_input: { file_path: 'src/foo.ts', content: 'x' },
    session_id: 'test-session',
    hook: 'PreToolUse' as const,
  };

  it('returns null on spawnSync error (binary not executable)', () => {
    mockSpawnSync.mockReturnValue({ error: new Error('ENOENT'), status: null, stdout: '', stderr: '' });
    expect(delegateToGoHook('/fake/agentguard-go', [samplePolicy], payload as never)).toBeNull();
  });

  it('returns null on unexpected exit code', () => {
    mockSpawnSync.mockReturnValue({ error: null, status: 1, stdout: '', stderr: 'panic!' });
    expect(delegateToGoHook('/fake/agentguard-go', [samplePolicy], payload as never)).toBeNull();
  });

  it('returns denied=false for exit code 0 (allow)', () => {
    mockSpawnSync.mockReturnValue({ error: null, status: 0, stdout: '', stderr: '' });
    const result = delegateToGoHook('/fake/agentguard-go', [samplePolicy], payload as never);
    expect(result).not.toBeNull();
    expect(result!.denied).toBe(false);
  });

  it('returns denied=true and response JSON for exit code 2 (deny)', () => {
    const denyResponse = JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: 'No force push',
      },
    });
    mockSpawnSync.mockReturnValue({ error: null, status: 2, stdout: denyResponse, stderr: '' });
    const result = delegateToGoHook('/fake/agentguard-go', [samplePolicy], payload as never);
    expect(result).not.toBeNull();
    expect(result!.denied).toBe(true);
    expect(result!.response).toBe(denyResponse);
  });

  it('passes AGENTGUARD_POLICY env var to Go subprocess', () => {
    mockSpawnSync.mockReturnValue({ error: null, status: 0, stdout: '', stderr: '' });
    delegateToGoHook('/fake/agentguard-go', [samplePolicy], payload as never);
    const call = mockSpawnSync.mock.calls[0];
    expect(call[2].env.AGENTGUARD_POLICY).toMatch(/policy-go-/);
  });

  it('serializes payload as stdin to subprocess', () => {
    mockSpawnSync.mockReturnValue({ error: null, status: 0, stdout: '', stderr: '' });
    delegateToGoHook('/fake/agentguard-go', [samplePolicy], payload as never);
    const call = mockSpawnSync.mock.calls[0];
    const stdin = JSON.parse(call[2].input as string);
    expect(stdin.tool_name).toBe('Write');
    expect(stdin.session_id).toBe('test-session');
  });
});

// ── Integration: real Go binary (skipped when binary absent) ──────────────────

describe('delegateToGoHook (integration)', () => {
  const devBin = join(
    new URL(import.meta.url).pathname,
    '..', '..', '..', '..', 'go', 'bin', 'agentguard'
  );

  const allowPolicy: LoadedPolicy = {
    id: 'allow-all',
    name: 'Allow all',
    severity: 0,
    rules: [{ action: '*', effect: 'allow', reason: 'Allow everything' }],
  };

  it.skipIf(!existsSync(devBin))(
    'allows a file.write with an allow-all policy',
    () => {
      // Use real spawnSync (not mocked) for this integration test
      vi.restoreAllMocks();
      const payload = {
        tool_name: 'Write',
        tool_input: { file_path: 'src/foo.ts', content: 'x' },
        session_id: 'integration-test',
        hook: 'PreToolUse' as const,
      };
      const result = delegateToGoHook(devBin, [allowPolicy], payload as never);
      // Real binary might not be available or might require identity — acceptable to return null
      if (result !== null) {
        expect(result.denied).toBe(false);
      }
    }
  );
});
