// Tests for role resolver — maps AgentRole to RoleDefinition
import { describe, it, expect } from 'vitest';
import {
  getDefaultRoleDefinition,
  getAllDefaultRoleDefinitions,
  resolveRole,
  resolveRoleDefinition,
  roleHasCapability,
} from '@red-codes/core';
import type { RunManifest, AgentRole } from '@red-codes/core';

function makeManifest(role: AgentRole): RunManifest {
  return {
    sessionId: 'session_test',
    role,
    grants: [],
    scope: { allowedPaths: ['**'] },
  };
}

describe('getDefaultRoleDefinition', () => {
  it('returns definition for builder role', () => {
    const def = getDefaultRoleDefinition('builder');
    expect(def.name).toBe('builder');
    expect(def.canModifyFiles).toBe(true);
    expect(def.canRunTests).toBe(true);
    expect(def.canRefactor).toBe(true);
  });

  it('returns definition for auditor role (read-only)', () => {
    const def = getDefaultRoleDefinition('auditor');
    expect(def.name).toBe('auditor');
    expect(def.canModifyFiles).toBe(false);
    expect(def.canRunTests).toBe(false);
    expect(def.canRefactor).toBe(false);
  });

  it('returns definition for architect role', () => {
    const def = getDefaultRoleDefinition('architect');
    expect(def.name).toBe('architect');
    expect(def.canModifyFiles).toBe(true);
    expect(def.canRunTests).toBe(false);
  });

  it('returns definition for tester role', () => {
    const def = getDefaultRoleDefinition('tester');
    expect(def.name).toBe('tester');
    expect(def.canRunTests).toBe(true);
    expect(def.canRefactor).toBe(false);
  });

  it('returns definition for optimizer role', () => {
    const def = getDefaultRoleDefinition('optimizer');
    expect(def.name).toBe('optimizer');
    expect(def.canRunTests).toBe(true);
    expect(def.canRefactor).toBe(true);
  });

  it('each definition has required fields', () => {
    const roles: AgentRole[] = ['architect', 'builder', 'tester', 'optimizer', 'auditor'];
    for (const role of roles) {
      const def = getDefaultRoleDefinition(role);
      expect(def.name).toBe(role);
      expect(def.description).toBeTruthy();
      expect(Array.isArray(def.responsibilities)).toBe(true);
      expect(def.responsibilities.length).toBeGreaterThan(0);
      expect(Array.isArray(def.allowedOutputs)).toBe(true);
      expect(def.allowedOutputs.length).toBeGreaterThan(0);
      expect(typeof def.canModifyFiles).toBe('boolean');
      expect(typeof def.canRunTests).toBe('boolean');
      expect(typeof def.canRefactor).toBe('boolean');
    }
  });
});

describe('getAllDefaultRoleDefinitions', () => {
  it('returns definitions for all 5 roles', () => {
    const all = getAllDefaultRoleDefinitions();
    expect(Object.keys(all)).toHaveLength(5);
    expect(all.architect).toBeDefined();
    expect(all.builder).toBeDefined();
    expect(all.tester).toBeDefined();
    expect(all.optimizer).toBeDefined();
    expect(all.auditor).toBeDefined();
  });
});

describe('resolveRole', () => {
  it('returns null when manifest is null', () => {
    expect(resolveRole(null)).toBeNull();
  });

  it('returns null when manifest is undefined', () => {
    expect(resolveRole(undefined)).toBeNull();
  });

  it('returns role from manifest', () => {
    expect(resolveRole(makeManifest('builder'))).toBe('builder');
    expect(resolveRole(makeManifest('auditor'))).toBe('auditor');
    expect(resolveRole(makeManifest('architect'))).toBe('architect');
  });
});

describe('resolveRoleDefinition', () => {
  it('returns null when manifest is null', () => {
    expect(resolveRoleDefinition(null)).toBeNull();
  });

  it('returns null when manifest is undefined', () => {
    expect(resolveRoleDefinition(undefined)).toBeNull();
  });

  it('returns full RoleDefinition for manifest role', () => {
    const def = resolveRoleDefinition(makeManifest('tester'));
    expect(def).not.toBeNull();
    expect(def!.name).toBe('tester');
    expect(def!.canRunTests).toBe(true);
  });
});

describe('roleHasCapability', () => {
  it('builder can modify files, run tests, and refactor', () => {
    expect(roleHasCapability('builder', 'canModifyFiles')).toBe(true);
    expect(roleHasCapability('builder', 'canRunTests')).toBe(true);
    expect(roleHasCapability('builder', 'canRefactor')).toBe(true);
  });

  it('auditor cannot modify files, run tests, or refactor', () => {
    expect(roleHasCapability('auditor', 'canModifyFiles')).toBe(false);
    expect(roleHasCapability('auditor', 'canRunTests')).toBe(false);
    expect(roleHasCapability('auditor', 'canRefactor')).toBe(false);
  });

  it('tester can run tests but cannot refactor', () => {
    expect(roleHasCapability('tester', 'canRunTests')).toBe(true);
    expect(roleHasCapability('tester', 'canRefactor')).toBe(false);
  });
});
