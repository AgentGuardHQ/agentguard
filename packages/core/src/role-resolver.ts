// Role resolver — maps AgentRole to default RoleDefinition and provides
// role resolution from a RunManifest. Used by the kernel to include role
// information in governance events and decision records.

import type { AgentRole, RoleDefinition, RunManifest } from './types.js';

/**
 * Default role definitions for each AgentRole.
 * These define the baseline capabilities and restrictions per role.
 * Policy rules can further restrict or extend these defaults.
 */
const DEFAULT_ROLE_DEFINITIONS: Record<AgentRole, RoleDefinition> = {
  architect: {
    name: 'architect',
    description: 'Plans architecture and designs system structure',
    responsibilities: ['system design', 'architecture review', 'technical planning'],
    allowedOutputs: ['documentation', 'specifications', 'diagrams'],
    canModifyFiles: true,
    canRunTests: false,
    canRefactor: false,
  },
  builder: {
    name: 'builder',
    description: 'Implements features and writes production code',
    responsibilities: ['feature implementation', 'code writing', 'integration'],
    allowedOutputs: ['source code', 'configuration', 'tests'],
    canModifyFiles: true,
    canRunTests: true,
    canRefactor: true,
  },
  tester: {
    name: 'tester',
    description: 'Writes and runs tests, validates behavior',
    responsibilities: ['test writing', 'test execution', 'validation'],
    allowedOutputs: ['test files', 'test reports', 'coverage data'],
    canModifyFiles: true,
    canRunTests: true,
    canRefactor: false,
  },
  optimizer: {
    name: 'optimizer',
    description: 'Improves performance and refactors code',
    responsibilities: ['performance optimization', 'code refactoring', 'profiling'],
    allowedOutputs: ['source code', 'benchmarks', 'profiling reports'],
    canModifyFiles: true,
    canRunTests: true,
    canRefactor: true,
  },
  auditor: {
    name: 'auditor',
    description: 'Reviews code and governance compliance (read-only)',
    responsibilities: ['code review', 'compliance audit', 'security review'],
    allowedOutputs: ['audit reports', 'review comments', 'compliance reports'],
    canModifyFiles: false,
    canRunTests: false,
    canRefactor: false,
  },
};

/**
 * Get the default RoleDefinition for an AgentRole.
 */
export function getDefaultRoleDefinition(role: AgentRole): RoleDefinition {
  return DEFAULT_ROLE_DEFINITIONS[role];
}

/**
 * Get all default role definitions.
 */
export function getAllDefaultRoleDefinitions(): Record<AgentRole, RoleDefinition> {
  return { ...DEFAULT_ROLE_DEFINITIONS };
}

/**
 * Resolve the agent role from a RunManifest.
 * Returns the role string if a manifest is provided, null otherwise.
 */
export function resolveRole(manifest: RunManifest | null | undefined): AgentRole | null {
  if (!manifest) return null;
  return manifest.role;
}

/**
 * Resolve the full RoleDefinition from a RunManifest.
 * Returns the default definition for the manifest's role, or null if no manifest.
 */
export function resolveRoleDefinition(
  manifest: RunManifest | null | undefined
): RoleDefinition | null {
  if (!manifest) return null;
  return DEFAULT_ROLE_DEFINITIONS[manifest.role];
}

/**
 * Check whether a role has a specific capability.
 */
export function roleHasCapability(
  role: AgentRole,
  capability: 'canModifyFiles' | 'canRunTests' | 'canRefactor'
): boolean {
  return DEFAULT_ROLE_DEFINITIONS[role][capability];
}
