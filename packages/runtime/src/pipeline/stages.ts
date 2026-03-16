// Stage definitions, validation gates, and file scope enforcement.
// Each stage validates inputs (from prior stages) and outputs (from the handler).

import type { AgentRole, StageId, StageDefinition } from '@red-codes/core';

/** Built-in stage definitions in execution order. */
export const STAGE_DEFINITIONS: readonly StageDefinition[] = [
  {
    id: 'plan',
    name: 'Architecture Planning',
    requiredRole: 'architect',
    inputRequirements: [],
    outputContract: ['files', 'constraints'],
  },
  {
    id: 'build',
    name: 'Implementation',
    requiredRole: 'builder',
    inputRequirements: ['files', 'constraints'],
    outputContract: ['changes'],
  },
  {
    id: 'test',
    name: 'Testing',
    requiredRole: 'tester',
    inputRequirements: ['changes'],
    outputContract: ['testResults'],
  },
  {
    id: 'optimize',
    name: 'Optimization',
    requiredRole: 'optimizer',
    inputRequirements: ['changes', 'testResults'],
    outputContract: ['changes'],
  },
  {
    id: 'audit',
    name: 'Audit Review',
    requiredRole: 'auditor',
    inputRequirements: ['changes', 'testResults'],
    outputContract: ['auditResult', 'violations'],
  },
];

/** Ordered stage IDs for sequential execution. */
export const STAGE_ORDER: readonly StageId[] = STAGE_DEFINITIONS.map((s) => s.id);

/** Get a stage definition by ID. */
export const getStage = (stageId: StageId): StageDefinition => {
  const stage = STAGE_DEFINITIONS.find((s) => s.id === stageId);
  if (!stage) {
    throw new Error(`Unknown stage: ${stageId}`);
  }
  return stage;
};

/** Validate that a role is authorized to execute a stage. */
export const validateRoleForStage = (
  stageId: StageId,
  role: AgentRole
): { valid: boolean; error?: string } => {
  const stage = getStage(stageId);
  if (stage.requiredRole !== role) {
    return {
      valid: false,
      error: `Stage "${stageId}" requires role "${stage.requiredRole}", got "${role}"`,
    };
  }
  return { valid: true };
};

/** Validate that all required inputs exist in the pipeline context. */
export const validateInputs = (
  stageId: StageId,
  context: Record<string, unknown>
): { valid: boolean; missing: string[] } => {
  const stage = getStage(stageId);
  const missing = stage.inputRequirements.filter((key) => !(key in context));
  return { valid: missing.length === 0, missing };
};

/** Validate that stage output contains all required contract fields. */
export const validateOutput = (
  stageId: StageId,
  output: Record<string, unknown>
): { valid: boolean; missing: string[] } => {
  const stage = getStage(stageId);
  const missing = stage.outputContract.filter((key) => !(key in output));
  return { valid: missing.length === 0, missing };
};

/**
 * Check file scope: verify that modified files are within the allowed set.
 * Used during the build stage to enforce the architect's declared file scope.
 */
export const checkFileScope = (
  modifiedFiles: readonly string[],
  allowedFiles: readonly string[]
): { valid: boolean; violations: string[] } => {
  const allowedSet = new Set(allowedFiles);
  const violations = modifiedFiles.filter((f) => !allowedSet.has(f));
  return { valid: violations.length === 0, violations };
};
