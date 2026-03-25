import { describe, it, expect } from 'vitest';
import { checkLoopGuards } from '../src/loop-guards.js';
import type { LoopGuardConfig, SquadState } from '../src/types.js';

const defaultGuards: LoopGuardConfig = {
  maxOpenPRsPerSquad: 3,
  maxRetries: 3,
  maxBlastRadius: 20,
  maxRunMinutes: 10,
};

describe('loop guards', () => {
  it('passes when all guards clear', () => {
    const state: SquadState = {
      squad: 'kernel',
      sprint: { goal: 'test', issues: [] },
      assignments: {},
      blockers: [],
      prQueue: { open: 1, reviewed: 0, mergeable: 0 },
      updatedAt: new Date().toISOString(),
    };
    const result = checkLoopGuards(defaultGuards, state, {
      retryCount: 0,
      predictedFileChanges: 5,
      runStartTime: Date.now(),
    });
    expect(result.allowed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('fails budget guard when too many PRs open', () => {
    const state: SquadState = {
      squad: 'kernel',
      sprint: { goal: 'test', issues: [] },
      assignments: {},
      blockers: [],
      prQueue: { open: 4, reviewed: 0, mergeable: 0 },
      updatedAt: new Date().toISOString(),
    };
    const result = checkLoopGuards(defaultGuards, state, {
      retryCount: 0,
      predictedFileChanges: 5,
      runStartTime: Date.now(),
    });
    expect(result.allowed).toBe(false);
    expect(result.violations).toContain('budget');
  });

  it('fails retry guard after 3 retries', () => {
    const state: SquadState = {
      squad: 'kernel',
      sprint: { goal: 'test', issues: [] },
      assignments: {},
      blockers: [],
      prQueue: { open: 0, reviewed: 0, mergeable: 0 },
      updatedAt: new Date().toISOString(),
    };
    const result = checkLoopGuards(defaultGuards, state, {
      retryCount: 4,
      predictedFileChanges: 5,
      runStartTime: Date.now(),
    });
    expect(result.allowed).toBe(false);
    expect(result.violations).toContain('retry');
  });

  it('fails blast radius guard when too many files', () => {
    const state: SquadState = {
      squad: 'kernel',
      sprint: { goal: 'test', issues: [] },
      assignments: {},
      blockers: [],
      prQueue: { open: 0, reviewed: 0, mergeable: 0 },
      updatedAt: new Date().toISOString(),
    };
    const result = checkLoopGuards(defaultGuards, state, {
      retryCount: 0,
      predictedFileChanges: 25,
      runStartTime: Date.now(),
    });
    expect(result.allowed).toBe(false);
    expect(result.violations).toContain('blast-radius');
  });

  it('fails time guard when run exceeds limit', () => {
    const state: SquadState = {
      squad: 'kernel',
      sprint: { goal: 'test', issues: [] },
      assignments: {},
      blockers: [],
      prQueue: { open: 0, reviewed: 0, mergeable: 0 },
      updatedAt: new Date().toISOString(),
    };
    const result = checkLoopGuards(defaultGuards, state, {
      retryCount: 0,
      predictedFileChanges: 5,
      runStartTime: Date.now() - 11 * 60 * 1000, // 11 min ago
    });
    expect(result.allowed).toBe(false);
    expect(result.violations).toContain('time');
  });

  it('reports multiple violations', () => {
    const state: SquadState = {
      squad: 'kernel',
      sprint: { goal: 'test', issues: [] },
      assignments: {},
      blockers: [],
      prQueue: { open: 5, reviewed: 0, mergeable: 0 },
      updatedAt: new Date().toISOString(),
    };
    const result = checkLoopGuards(defaultGuards, state, {
      retryCount: 4,
      predictedFileChanges: 25,
      runStartTime: Date.now() - 15 * 60 * 1000,
    });
    expect(result.allowed).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(3);
  });
});
