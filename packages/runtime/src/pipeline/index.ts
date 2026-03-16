// Multi-agent pipeline orchestration — public API.
// Re-exports roles, stages, and orchestrator for external consumption.

export { ROLE_DEFINITIONS, getRole, isRoleAuthorized } from './roles.js';
export {
  STAGE_DEFINITIONS,
  STAGE_ORDER,
  getStage,
  validateRoleForStage,
  validateInputs,
  validateOutput,
  checkFileScope,
} from './stages.js';
export { runPipeline } from './orchestrator.js';
export type { StageHandler, StageHandlers, PipelineOptions } from './orchestrator.js';
