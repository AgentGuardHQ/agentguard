// Pipeline orchestrator — creates and executes multi-agent pipelines sequentially.
// Each stage runs through validation gates before and after execution.
// Emits canonical pipeline events into the domain event model.

import type { DomainEvent, StageId, StageStatus, StageResult, PipelineRun } from '@red-codes/core';
import {
  createEvent,
  PIPELINE_STARTED,
  STAGE_COMPLETED,
  STAGE_FAILED,
  PIPELINE_COMPLETED,
  PIPELINE_FAILED,
  FILE_SCOPE_VIOLATION,
} from '@red-codes/events';
import { STAGE_ORDER, getStage, validateInputs, validateOutput, checkFileScope } from './stages.js';

/** Handler function that a stage executor calls. Receives the pipeline context, returns output. */
export type StageHandler = (context: Record<string, unknown>) => Record<string, unknown>;

/** Map of stage IDs to their handler functions. */
export type StageHandlers = Partial<Record<StageId, StageHandler>>;

/** Options for creating a pipeline run. */
export interface PipelineOptions {
  /** Optional event sink — receives events as they are emitted. */
  onEvent?: (event: DomainEvent) => void;
}

/** Create a unique run ID. */
const createRunId = (): string =>
  `pipeline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/** Build the initial stages record with all stages pending. */
const initStages = (): Record<StageId, StageResult> => {
  const stages = {} as Record<StageId, StageResult>;
  for (const id of STAGE_ORDER) {
    stages[id] = { stageId: id, status: 'pending' as StageStatus };
  }
  return stages;
};

/**
 * Run a multi-agent pipeline to completion.
 *
 * Stages execute sequentially: plan → build → test → optimize → audit.
 * Each stage validates inputs, runs the handler, validates output,
 * and (for build) checks file scope. If any gate fails, the pipeline halts.
 *
 * @param task - Description of the task being orchestrated
 * @param handlers - Map of stage IDs to handler functions
 * @param options - Optional configuration (event sink, etc.)
 * @returns The completed PipelineRun
 */
export const runPipeline = (
  task: string,
  handlers: StageHandlers,
  options: PipelineOptions = {}
): PipelineRun => {
  const runId = createRunId();
  const startedAt = Date.now();
  const context: Record<string, unknown> = {};
  const events: DomainEvent[] = [];
  const stages = initStages();

  const emit = (event: DomainEvent): void => {
    events.push(event);
    options.onEvent?.(event);
  };

  // Emit PipelineStarted
  emit(
    createEvent(PIPELINE_STARTED, {
      runId,
      task,
      agentRoles: STAGE_ORDER.map((id) => getStage(id).requiredRole),
      stageCount: STAGE_ORDER.length,
    })
  );

  let failedStage: StageId | null = null;
  let failErrors: string[] = [];

  for (const stageId of STAGE_ORDER) {
    const handler = handlers[stageId];
    if (!handler) {
      // No handler provided — skip this stage
      stages[stageId] = { stageId, status: 'skipped' as StageStatus };
      continue;
    }

    const stageStart = Date.now();
    const stageDef = getStage(stageId);

    // Gate 1: Input validation
    const inputCheck = validateInputs(stageId, context);
    if (!inputCheck.valid) {
      const errors = [`Missing required inputs: ${inputCheck.missing.join(', ')}`];
      stages[stageId] = { stageId, status: 'failed' as StageStatus, errors };
      emit(
        createEvent(STAGE_FAILED, {
          runId,
          stageId,
          errors,
          agentRole: stageDef.requiredRole,
          duration: Date.now() - stageStart,
        })
      );
      failedStage = stageId;
      failErrors = errors;
      break;
    }

    // Gate 2: Execute handler
    let output: Record<string, unknown>;
    try {
      output = handler(context);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const errors = [`Handler threw: ${message}`];
      stages[stageId] = { stageId, status: 'failed' as StageStatus, errors };
      emit(
        createEvent(STAGE_FAILED, {
          runId,
          stageId,
          errors,
          agentRole: stageDef.requiredRole,
          duration: Date.now() - stageStart,
        })
      );
      failedStage = stageId;
      failErrors = errors;
      break;
    }

    // Gate 3: Output validation
    const outputCheck = validateOutput(stageId, output);
    if (!outputCheck.valid) {
      const errors = [`Missing required outputs: ${outputCheck.missing.join(', ')}`];
      stages[stageId] = { stageId, status: 'failed' as StageStatus, errors };
      emit(
        createEvent(STAGE_FAILED, {
          runId,
          stageId,
          errors,
          agentRole: stageDef.requiredRole,
          duration: Date.now() - stageStart,
        })
      );
      failedStage = stageId;
      failErrors = errors;
      break;
    }

    // Gate 4: File scope enforcement (build stage only)
    if (stageId === 'build' && output.changes && context.files) {
      const allowedFiles = context.files as string[];
      const modifiedFiles = Object.keys(output.changes as Record<string, unknown>);
      const scopeCheck = checkFileScope(modifiedFiles, allowedFiles);
      if (!scopeCheck.valid) {
        emit(
          createEvent(FILE_SCOPE_VIOLATION, {
            runId,
            files: scopeCheck.violations,
            allowedFiles,
            agentRole: 'builder',
          })
        );
        const errors = [
          `File scope violation: ${scopeCheck.violations.join(', ')} not in allowed scope`,
        ];
        stages[stageId] = { stageId, status: 'failed' as StageStatus, errors };
        emit(
          createEvent(STAGE_FAILED, {
            runId,
            stageId,
            errors,
            agentRole: stageDef.requiredRole,
            duration: Date.now() - stageStart,
          })
        );
        failedStage = stageId;
        failErrors = errors;
        break;
      }
    }

    // Stage passed — merge output into context
    Object.assign(context, output);
    const duration = Date.now() - stageStart;
    stages[stageId] = {
      stageId,
      status: 'passed' as StageStatus,
      output,
      duration,
    };
    emit(
      createEvent(STAGE_COMPLETED, {
        runId,
        stageId,
        status: 'passed',
        duration,
        outputKeys: Object.keys(output),
        agentRole: stageDef.requiredRole,
      })
    );
  }

  // Emit final pipeline event
  const duration = Date.now() - startedAt;
  const stagesCompleted = Object.values(stages).filter((s) => s.status === 'passed').length;

  if (failedStage) {
    emit(
      createEvent(PIPELINE_FAILED, {
        runId,
        failedStage,
        errors: failErrors,
        duration,
        stagesCompleted,
        task,
      })
    );
    return {
      runId,
      task,
      stages,
      context,
      events,
      startedAt,
      status: 'failed',
    };
  }

  emit(
    createEvent(PIPELINE_COMPLETED, {
      runId,
      result: 'completed',
      duration,
      stagesCompleted,
      task,
    })
  );

  return {
    runId,
    task,
    stages,
    context,
    events,
    startedAt,
    status: 'completed',
  };
};
