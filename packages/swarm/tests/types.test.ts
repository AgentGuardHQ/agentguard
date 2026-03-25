import { describe, it, expect } from 'vitest';
import type {
  SquadManifest,
  Squad,
  SquadAgent,
  SquadRank,
  SquadState,
  LoopGuardConfig,
} from '../src/types.js';

describe('Squad types', () => {
  it('SquadAgent has driver, model, squad, rank fields', () => {
    const agent: SquadAgent = {
      id: 'kernel-senior',
      rank: 'senior',
      driver: 'copilot-cli',
      model: 'sonnet',
      cron: '0 */2 * * *',
      skills: ['claim-issue', 'implement-issue', 'create-pr'],
    };
    expect(agent.driver).toBe('copilot-cli');
    expect(agent.rank).toBe('senior');
  });

  it('Squad contains em + 5 agents', () => {
    const squad: Squad = {
      name: 'kernel',
      repo: 'agent-guard',
      em: {
        id: 'kernel-em',
        rank: 'em',
        driver: 'claude-code',
        model: 'opus',
        cron: '0 */3 * * *',
        skills: ['squad-plan', 'squad-execute'],
      },
      agents: {
        'product-lead': { id: 'kernel-pl', rank: 'product-lead', driver: 'claude-code', model: 'sonnet', cron: '0 6 * * *', skills: [] },
        architect: { id: 'kernel-arch', rank: 'architect', driver: 'claude-code', model: 'opus', cron: '0 */4 * * *', skills: [] },
        senior: { id: 'kernel-sr', rank: 'senior', driver: 'copilot-cli', model: 'sonnet', cron: '0 */2 * * *', skills: [] },
        junior: { id: 'kernel-jr', rank: 'junior', driver: 'copilot-cli', model: 'copilot', cron: '0 */2 * * *', skills: [] },
        qa: { id: 'kernel-qa', rank: 'qa', driver: 'copilot-cli', model: 'sonnet', cron: '0 */3 * * *', skills: [] },
      },
    };
    expect(Object.keys(squad.agents)).toHaveLength(5);
    expect(squad.em.rank).toBe('em');
  });

  it('SquadManifest has director + squads', () => {
    const manifest: SquadManifest = {
      version: '1.0.0',
      org: {
        director: { id: 'director', rank: 'director', driver: 'claude-code', model: 'opus', cron: '0 7,19 * * *', skills: [] },
      },
      squads: {},
      loopGuards: {
        maxOpenPRsPerSquad: 3,
        maxRetries: 3,
        maxBlastRadius: 20,
        maxRunMinutes: 10,
      },
    };
    expect(manifest.org.director.rank).toBe('director');
  });

  it('SquadRank includes all valid ranks', () => {
    const ranks: SquadRank[] = ['director', 'em', 'product-lead', 'architect', 'senior', 'junior', 'qa'];
    expect(ranks).toHaveLength(7);
  });
});
