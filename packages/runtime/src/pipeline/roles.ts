// Agent role definitions and permission checks for the multi-agent pipeline.
// Each role has strict permission boundaries that are enforced by the orchestrator.

import type { AgentRole, RoleDefinition } from '@red-codes/core';

/**
 * Built-in role definitions with strict permission boundaries.
 *
 * | Role       | Modify Files | Run Tests | Refactor |
 * |------------|-------------|-----------|----------|
 * | Architect  | No          | No        | No       |
 * | Builder    | Yes         | No        | No       |
 * | Tester     | Yes         | Yes       | No       |
 * | Optimizer  | Yes         | Yes       | Yes      |
 * | Auditor    | No          | Yes       | No       |
 */
export const ROLE_DEFINITIONS: Readonly<Record<AgentRole, RoleDefinition>> = {
  architect: {
    name: 'architect',
    description: 'Interprets specifications and produces an implementation plan',
    responsibilities: [
      'Define file scope for implementation',
      'Declare constraints and invariants',
      'Produce architecture plan',
    ],
    allowedOutputs: ['files', 'constraints'],
    canModifyFiles: false,
    canRunTests: false,
    canRefactor: false,
  },
  builder: {
    name: 'builder',
    description: 'Writes code following the architecture plan',
    responsibilities: [
      'Implement code within declared file scope',
      'Follow architecture constraints',
      'Produce implementation changes',
    ],
    allowedOutputs: ['changes'],
    canModifyFiles: true,
    canRunTests: false,
    canRefactor: false,
  },
  tester: {
    name: 'tester',
    description: 'Generates tests and identifies coverage gaps',
    responsibilities: ['Generate test cases', 'Run test scenarios', 'Report coverage gaps'],
    allowedOutputs: ['testResults', 'gaps'],
    canModifyFiles: true,
    canRunTests: true,
    canRefactor: false,
  },
  optimizer: {
    name: 'optimizer',
    description: 'Refactors for clarity and performance without changing behavior',
    responsibilities: [
      'Refactor for clarity',
      'Optimize performance',
      'Preserve public interfaces',
    ],
    allowedOutputs: ['changes'],
    canModifyFiles: true,
    canRunTests: true,
    canRefactor: true,
  },
  auditor: {
    name: 'auditor',
    description: 'Final safety layer — reviews boundaries, enforces invariants',
    responsibilities: [
      'Review architecture boundaries',
      'Detect anti-patterns',
      'Enforce invariants',
    ],
    allowedOutputs: ['auditResult', 'violations'],
    canModifyFiles: false,
    canRunTests: true,
    canRefactor: false,
  },
};

/** Get the role definition for a given agent role. */
export const getRole = (role: AgentRole): RoleDefinition => {
  const def = ROLE_DEFINITIONS[role];
  if (!def) {
    throw new Error(`Unknown agent role: ${role}`);
  }
  return def;
};

/** Check if a role is authorized to perform a specific action category. */
export const isRoleAuthorized = (
  role: AgentRole,
  action: 'modifyFiles' | 'runTests' | 'refactor'
): boolean => {
  const def = getRole(role);
  switch (action) {
    case 'modifyFiles':
      return def.canModifyFiles;
    case 'runTests':
      return def.canRunTests;
    case 'refactor':
      return def.canRefactor;
    default:
      return false;
  }
};
