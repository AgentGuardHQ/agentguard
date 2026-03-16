// Tests for the multi-agent pipeline orchestration module.
import { describe, it, expect, beforeEach } from 'vitest';
import { resetEventCounter } from '@red-codes/events';
import {
  ROLE_DEFINITIONS,
  getRole,
  isRoleAuthorized,
  STAGE_DEFINITIONS,
  STAGE_ORDER,
  getStage,
  validateRoleForStage,
  validateInputs,
  validateOutput,
  checkFileScope,
  runPipeline,
} from '@red-codes/runtime';
import type { StageHandlers } from '@red-codes/runtime';
import type { DomainEvent } from '@red-codes/core';

beforeEach(() => {
  resetEventCounter();
});

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

describe('roles', () => {
  it('defines five agent roles', () => {
    expect(Object.keys(ROLE_DEFINITIONS)).toHaveLength(5);
    expect(Object.keys(ROLE_DEFINITIONS)).toEqual([
      'architect',
      'builder',
      'tester',
      'optimizer',
      'auditor',
    ]);
  });

  it('getRole returns a valid role definition', () => {
    const builder = getRole('builder');
    expect(builder.name).toBe('builder');
    expect(builder.canModifyFiles).toBe(true);
    expect(builder.canRunTests).toBe(false);
  });

  it('getRole throws for unknown role', () => {
    expect(() => getRole('hacker' as never)).toThrow('Unknown agent role');
  });

  it('architect cannot modify files, run tests, or refactor', () => {
    expect(isRoleAuthorized('architect', 'modifyFiles')).toBe(false);
    expect(isRoleAuthorized('architect', 'runTests')).toBe(false);
    expect(isRoleAuthorized('architect', 'refactor')).toBe(false);
  });

  it('builder can modify files but not run tests or refactor', () => {
    expect(isRoleAuthorized('builder', 'modifyFiles')).toBe(true);
    expect(isRoleAuthorized('builder', 'runTests')).toBe(false);
    expect(isRoleAuthorized('builder', 'refactor')).toBe(false);
  });

  it('optimizer can modify files, run tests, and refactor', () => {
    expect(isRoleAuthorized('optimizer', 'modifyFiles')).toBe(true);
    expect(isRoleAuthorized('optimizer', 'runTests')).toBe(true);
    expect(isRoleAuthorized('optimizer', 'refactor')).toBe(true);
  });

  it('auditor can run tests but not modify files or refactor', () => {
    expect(isRoleAuthorized('auditor', 'modifyFiles')).toBe(false);
    expect(isRoleAuthorized('auditor', 'runTests')).toBe(true);
    expect(isRoleAuthorized('auditor', 'refactor')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Stages
// ---------------------------------------------------------------------------

describe('stages', () => {
  it('defines five stages in order', () => {
    expect(STAGE_ORDER).toEqual(['plan', 'build', 'test', 'optimize', 'audit']);
    expect(STAGE_DEFINITIONS).toHaveLength(5);
  });

  it('getStage returns the correct stage definition', () => {
    const build = getStage('build');
    expect(build.name).toBe('Implementation');
    expect(build.requiredRole).toBe('builder');
    expect(build.inputRequirements).toContain('files');
    expect(build.outputContract).toContain('changes');
  });

  it('getStage throws for unknown stage', () => {
    expect(() => getStage('deploy' as never)).toThrow('Unknown stage');
  });

  it('validateRoleForStage passes for correct role', () => {
    expect(validateRoleForStage('plan', 'architect')).toEqual({ valid: true });
    expect(validateRoleForStage('build', 'builder')).toEqual({ valid: true });
    expect(validateRoleForStage('audit', 'auditor')).toEqual({ valid: true });
  });

  it('validateRoleForStage fails for wrong role', () => {
    const result = validateRoleForStage('build', 'architect');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('requires role "builder"');
  });

  it('validateInputs passes when all inputs exist in context', () => {
    const result = validateInputs('build', { files: ['a.ts'], constraints: ['no side effects'] });
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('validateInputs fails when inputs are missing', () => {
    const result = validateInputs('build', {});
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('files');
    expect(result.missing).toContain('constraints');
  });

  it('validateOutput passes when all outputs are present', () => {
    const result = validateOutput('plan', { files: ['a.ts'], constraints: ['pure functions'] });
    expect(result.valid).toBe(true);
  });

  it('validateOutput fails when outputs are missing', () => {
    const result = validateOutput('plan', { files: ['a.ts'] });
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('constraints');
  });

  it('checkFileScope passes for files within scope', () => {
    const result = checkFileScope(['src/a.ts', 'src/b.ts'], ['src/a.ts', 'src/b.ts', 'src/c.ts']);
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('checkFileScope detects violations', () => {
    const result = checkFileScope(['src/a.ts', 'src/secret.ts'], ['src/a.ts']);
    expect(result.valid).toBe(false);
    expect(result.violations).toEqual(['src/secret.ts']);
  });
});

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

describe('orchestrator', () => {
  const makeHandlers = (): StageHandlers => ({
    plan: () => ({
      files: ['src/feature.ts'],
      constraints: ['no side effects'],
    }),
    build: () => ({
      changes: { 'src/feature.ts': '// implementation' },
    }),
    test: () => ({
      testResults: { passed: 3, failed: 0 },
    }),
    optimize: () => ({
      changes: { 'src/feature.ts': '// optimized' },
    }),
    audit: () => ({
      auditResult: 'pass',
      violations: [],
    }),
  });

  it('runs a full pipeline to completion', () => {
    const run = runPipeline('implement feature X', makeHandlers());
    expect(run.status).toBe('completed');
    expect(run.task).toBe('implement feature X');
    expect(run.runId).toMatch(/^pipeline_/);
    expect(run.stages.plan.status).toBe('passed');
    expect(run.stages.build.status).toBe('passed');
    expect(run.stages.test.status).toBe('passed');
    expect(run.stages.optimize.status).toBe('passed');
    expect(run.stages.audit.status).toBe('passed');
  });

  it('emits PipelineStarted and PipelineCompleted events', () => {
    const run = runPipeline('test task', makeHandlers());
    const kinds = run.events.map((e) => e.kind);
    expect(kinds[0]).toBe('PipelineStarted');
    expect(kinds[kinds.length - 1]).toBe('PipelineCompleted');
  });

  it('emits StageCompleted for each passing stage', () => {
    const run = runPipeline('test task', makeHandlers());
    const stageCompleted = run.events.filter((e) => e.kind === 'StageCompleted');
    expect(stageCompleted).toHaveLength(5);
  });

  it('calls onEvent callback for each event', () => {
    const collected: DomainEvent[] = [];
    runPipeline('test task', makeHandlers(), {
      onEvent: (e) => collected.push(e),
    });
    expect(collected.length).toBeGreaterThan(0);
    expect(collected[0].kind).toBe('PipelineStarted');
  });

  it('fails when a handler throws', () => {
    const handlers = makeHandlers();
    handlers.build = () => {
      throw new Error('compilation failed');
    };
    const run = runPipeline('broken build', handlers);
    expect(run.status).toBe('failed');
    expect(run.stages.build.status).toBe('failed');
    expect(run.stages.build.errors?.[0]).toContain('Handler threw: compilation failed');
    // Subsequent stages remain pending
    expect(run.stages.test.status).toBe('pending');
  });

  it('fails when output contract is not satisfied', () => {
    const handlers = makeHandlers();
    handlers.plan = () => ({ files: ['src/a.ts'] }); // missing 'constraints'
    const run = runPipeline('missing output', handlers);
    expect(run.status).toBe('failed');
    expect(run.stages.plan.status).toBe('failed');
    expect(run.stages.plan.errors?.[0]).toContain('Missing required outputs: constraints');
  });

  it('fails when input requirements are not met', () => {
    // Skip plan handler so build has no 'files' or 'constraints' in context
    const handlers: StageHandlers = {
      build: () => ({
        changes: { 'src/a.ts': '// code' },
      }),
    };
    const run = runPipeline('missing inputs', handlers);
    expect(run.status).toBe('failed');
    expect(run.stages.build.status).toBe('failed');
    expect(run.stages.build.errors?.[0]).toContain('Missing required inputs');
  });

  it('detects file scope violations during build', () => {
    const handlers = makeHandlers();
    handlers.build = () => ({
      changes: {
        'src/feature.ts': '// allowed',
        'src/unauthorized.ts': '// not in scope',
      },
    });
    const run = runPipeline('scope violation', handlers);
    expect(run.status).toBe('failed');
    expect(run.stages.build.status).toBe('failed');
    const scopeEvent = run.events.find((e) => e.kind === 'FileScopeViolation');
    expect(scopeEvent).toBeDefined();
    expect((scopeEvent as Record<string, unknown>).files).toContain('src/unauthorized.ts');
  });

  it('emits PipelineFailed event on failure', () => {
    const handlers = makeHandlers();
    handlers.test = () => {
      throw new Error('test crashed');
    };
    const run = runPipeline('crash test', handlers);
    const failEvent = run.events.find((e) => e.kind === 'PipelineFailed');
    expect(failEvent).toBeDefined();
    expect((failEvent as Record<string, unknown>).failedStage).toBe('test');
  });

  it('skips stages without handlers', () => {
    const handlers: StageHandlers = {
      plan: () => ({
        files: ['src/a.ts'],
        constraints: ['none'],
      }),
      build: () => ({
        changes: { 'src/a.ts': '// code' },
      }),
      // test, optimize, audit are skipped
    };
    const run = runPipeline('partial pipeline', handlers);
    expect(run.status).toBe('completed');
    expect(run.stages.plan.status).toBe('passed');
    expect(run.stages.build.status).toBe('passed');
    expect(run.stages.test.status).toBe('skipped');
    expect(run.stages.optimize.status).toBe('skipped');
    expect(run.stages.audit.status).toBe('skipped');
  });

  it('merges stage output into context for subsequent stages', () => {
    let buildContext: Record<string, unknown> = {};
    const handlers: StageHandlers = {
      plan: () => ({
        files: ['src/a.ts'],
        constraints: ['pure functions'],
      }),
      build: (ctx) => {
        buildContext = { ...ctx };
        return { changes: { 'src/a.ts': '// code' } };
      },
    };
    runPipeline('context passing', handlers);
    expect(buildContext.files).toEqual(['src/a.ts']);
    expect(buildContext.constraints).toEqual(['pure functions']);
  });

  it('pipeline events include runId consistently', () => {
    const run = runPipeline('consistency check', makeHandlers());
    for (const event of run.events) {
      expect((event as Record<string, unknown>).runId).toBe(run.runId);
    }
  });
});
