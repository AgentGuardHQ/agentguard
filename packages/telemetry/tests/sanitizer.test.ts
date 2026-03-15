// Tests for privacy-safe action sanitizer
import { describe, it, expect } from 'vitest';
import {
  sanitizeAction,
  classifyTarget,
  classifyCommand,
  hashTarget,
} from '../src/sanitizer.js';
import type { GovernanceDecisionRecord } from '@red-codes/core';

function makeRecord(
  overrides: Partial<GovernanceDecisionRecord> = {}
): GovernanceDecisionRecord {
  return {
    recordId: 'dec_1',
    runId: 'run_1',
    timestamp: 1700000000000,
    action: { type: 'file.read', target: 'src/index.ts', agent: 'agent', destructive: false },
    outcome: 'allow',
    reason: 'Allowed',
    intervention: null,
    policy: { matchedPolicyId: null, matchedPolicyName: null, severity: 0 },
    invariants: { allHold: true, violations: [] },
    simulation: null,
    evidencePackId: null,
    monitor: { escalationLevel: 'NORMAL', totalEvaluations: 1, totalDenials: 0 },
    execution: { executed: false, success: null, durationMs: null, error: null },
    ...overrides,
  } as GovernanceDecisionRecord;
}

describe('hashTarget', () => {
  it('produces a sha256-prefixed hash', () => {
    const hash = hashTarget('test.ts');
    expect(hash).toMatch(/^sha256:[0-9a-f]{16}$/);
  });

  it('produces consistent hashes for same input', () => {
    expect(hashTarget('foo.ts')).toBe(hashTarget('foo.ts'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashTarget('foo.ts')).not.toBe(hashTarget('bar.ts'));
  });

  it('handles empty string', () => {
    expect(hashTarget('')).toBe('sha256:0000000000000000');
  });
});

describe('classifyTarget', () => {
  it('classifies TypeScript files as source', () => {
    expect(classifyTarget('src/index.ts')).toBe('source');
  });

  it('classifies Python files as source', () => {
    expect(classifyTarget('main.py')).toBe('source');
  });

  it('classifies .env as credential', () => {
    expect(classifyTarget('.env')).toBe('credential');
  });

  it('classifies SSH keys as credential', () => {
    expect(classifyTarget('.ssh/id_rsa')).toBe('credential');
  });

  it('classifies test files as test', () => {
    expect(classifyTarget('src/utils.test.ts')).toBe('test');
  });

  it('classifies spec files as test', () => {
    expect(classifyTarget('src/utils.spec.js')).toBe('test');
  });

  it('classifies dist output as build', () => {
    expect(classifyTarget('dist/index.js')).toBe('build');
  });

  it('classifies package.json as config', () => {
    expect(classifyTarget('package.json')).toBe('config');
  });

  it('classifies YAML as config', () => {
    expect(classifyTarget('config.yaml')).toBe('config');
  });

  it('classifies binary extensions', () => {
    expect(classifyTarget('app.exe')).toBe('binary');
    expect(classifyTarget('lib.so')).toBe('binary');
  });

  it('returns unknown for unrecognized paths', () => {
    expect(classifyTarget('README.md')).toBe('unknown');
  });

  it('handles empty string', () => {
    expect(classifyTarget('')).toBe('unknown');
  });
});

describe('classifyCommand', () => {
  it('classifies sensitive file access by target', () => {
    expect(classifyCommand(undefined, '.env')).toBe('sensitive_file_access');
  });

  it('returns benign for normal commands', () => {
    expect(classifyCommand('echo hello', 'output.txt')).toBe('benign');
  });

  it('returns benign when no command and normal target', () => {
    expect(classifyCommand(undefined, 'src/app.ts')).toBe('benign');
  });

  it('detects sensitive file access in commands', () => {
    expect(classifyCommand('cat .env', 'stdout')).toBe('sensitive_file_access');
  });
});

describe('sanitizeAction', () => {
  it('sanitizes a normal file read', () => {
    const result = sanitizeAction(makeRecord());
    expect(result.target_type).toBe('source');
    expect(result.target_hash).toMatch(/^sha256:[0-9a-f]{16}$/);
    expect(result.args_classification).toBe('benign');
  });

  it('never exposes the raw target path', () => {
    const result = sanitizeAction(
      makeRecord({
        action: { type: 'file.read', target: '/secret/path/credentials.json', agent: 'a', destructive: false },
      })
    );
    expect(result.target_hash).not.toContain('secret');
    expect(result.target_hash).not.toContain('credentials');
    expect(result.target_type).toBe('credential');
  });

  it('classifies credential access', () => {
    const result = sanitizeAction(
      makeRecord({
        action: { type: 'file.read', target: '.env', agent: 'a', destructive: false },
      })
    );
    expect(result.target_type).toBe('credential');
    expect(result.args_classification).toBe('sensitive_file_access');
  });

  it('handles missing command gracefully', () => {
    const result = sanitizeAction(
      makeRecord({
        action: { type: 'file.write', target: 'output.ts', agent: 'a', destructive: false },
      })
    );
    expect(result.args_classification).toBe('benign');
  });
});
