import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readSquadState, writeSquadState, readEMReport, writeEMReport, readDirectorBrief, writeDirectorBrief } from '../src/squad-state.js';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('squad state', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'squad-'));
    mkdirSync(join(dir, '.agentguard', 'squads', 'kernel'), { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes and reads squad state', () => {
    const state = {
      squad: 'kernel',
      sprint: { goal: 'Go kernel Phase 2', issues: ['#860'] },
      assignments: {
        senior: { current: '#860', status: 'implementing' },
      },
      blockers: [],
      prQueue: { open: 1, reviewed: 0, mergeable: 0 },
      updatedAt: new Date().toISOString(),
    };
    writeSquadState(dir, 'kernel', state);
    const read = readSquadState(dir, 'kernel');
    expect(read?.squad).toBe('kernel');
    expect(read?.sprint.goal).toBe('Go kernel Phase 2');
  });

  it('returns null for missing state', () => {
    const read = readSquadState(dir, 'nonexistent');
    expect(read).toBeNull();
  });

  it('writes and reads EM report', () => {
    const report = {
      squad: 'kernel',
      timestamp: new Date().toISOString(),
      health: 'green' as const,
      summary: 'All clear',
      blockers: [],
      escalations: [],
      metrics: { prsOpened: 2, prsMerged: 1, issuesClosed: 3, denials: 0, retries: 0 },
    };
    writeEMReport(dir, 'kernel', report);
    const read = readEMReport(dir, 'kernel');
    expect(read?.health).toBe('green');
  });

  it('writes and reads director brief', () => {
    const brief = {
      timestamp: new Date().toISOString(),
      squads: {},
      escalationsForHuman: ['Need decision on Go vs Rust for hot path'],
      overallHealth: 'yellow' as const,
    };
    writeDirectorBrief(dir, brief);
    const read = readDirectorBrief(dir);
    expect(read?.overallHealth).toBe('yellow');
    expect(read?.escalationsForHuman).toHaveLength(1);
  });
});
