import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations, agentSummaries, teamReport } from '@red-codes/storage';

function insertEvent(
  db: Database.Database,
  overrides: {
    id?: string;
    runId?: string;
    kind?: string;
    timestamp?: number;
    data?: Record<string, unknown>;
  } = {}
): void {
  const id = overrides.id ?? `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const runId = overrides.runId ?? 'run_1';
  const kind = overrides.kind ?? 'ActionRequested';
  const timestamp = overrides.timestamp ?? Date.now();
  const data = overrides.data ?? {};

  db.prepare(
    'INSERT INTO events (id, run_id, kind, timestamp, fingerprint, data) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, runId, kind, timestamp, 'fp_test', JSON.stringify(data));
}

function insertSession(
  db: Database.Database,
  runId: string,
  agentId: string | null,
  startedAt?: number
): void {
  const ts = startedAt ? new Date(startedAt).toISOString() : new Date().toISOString();
  db.prepare(
    'INSERT OR IGNORE INTO sessions (id, started_at, ended_at, command, repo, agent_id, data) VALUES (?, ?, NULL, ?, ?, ?, ?)'
  ).run(runId, ts, 'guard', '/repo', agentId, '{}');
}

function insertDecision(
  db: Database.Database,
  overrides: {
    recordId?: string;
    runId?: string;
    outcome?: string;
    actionType?: string;
    target?: string;
    reason?: string;
    timestamp?: number;
  } = {}
): void {
  const recordId =
    overrides.recordId ?? `dec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const runId = overrides.runId ?? 'run_1';
  const outcome = overrides.outcome ?? 'allowed';
  const actionType = overrides.actionType ?? 'file.write';
  const target = overrides.target ?? 'src/main.ts';
  const reason = overrides.reason ?? 'policy match';
  const timestamp = overrides.timestamp ?? Date.now();

  db.prepare(
    `INSERT INTO decisions (record_id, run_id, timestamp, outcome, action_type, target, reason, data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(recordId, runId, timestamp, outcome, actionType, target, reason, JSON.stringify({}));
}

describe('Team Aggregation Queries', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    runMigrations(db);
  });

  describe('agentSummaries', () => {
    it('returns empty array for empty database', () => {
      expect(agentSummaries(db)).toEqual([]);
    });

    it('groups sessions by agent name from sessions.agent_id', () => {
      const now = Date.now();

      // Agent 1: two sessions
      insertSession(db, 'run_1', 'agent-alpha', now - 3000);
      insertDecision(db, { runId: 'run_1', outcome: 'allowed', timestamp: now - 2000 });
      insertDecision(db, { runId: 'run_1', outcome: 'allowed', timestamp: now - 1000 });
      // Insert events so the run_id appears in the events table
      insertEvent(db, { runId: 'run_1', kind: 'ActionAllowed', timestamp: now - 2000 });

      insertSession(db, 'run_2', 'agent-alpha', now - 500);
      insertDecision(db, { runId: 'run_2', outcome: 'denied', timestamp: now - 400 });
      insertEvent(db, { runId: 'run_2', kind: 'ActionDenied', timestamp: now - 400 });

      // Agent 2: one session
      insertSession(db, 'run_3', 'agent-beta', now - 200);
      insertDecision(db, { runId: 'run_3', outcome: 'allowed', timestamp: now - 100 });
      insertEvent(db, { runId: 'run_3', kind: 'ActionAllowed', timestamp: now - 100 });

      const summaries = agentSummaries(db);

      expect(summaries).toHaveLength(2);

      const alpha = summaries.find((s) => s.agent === 'agent-alpha');
      expect(alpha).toBeDefined();
      expect(alpha!.sessions).toBe(2);
      expect(alpha!.totalActions).toBe(3);
      expect(alpha!.allowed).toBe(2);
      expect(alpha!.denied).toBe(1);

      const beta = summaries.find((s) => s.agent === 'agent-beta');
      expect(beta).toBeDefined();
      expect(beta!.sessions).toBe(1);
      expect(beta!.totalActions).toBe(1);
      expect(beta!.allowed).toBe(1);
      expect(beta!.denied).toBe(0);
    });

    it('labels sessions without agent identity as "unknown"', () => {
      const now = Date.now();

      insertSession(db, 'run_1', null, now);
      insertEvent(db, { runId: 'run_1', kind: 'ActionAllowed', timestamp: now });
      insertDecision(db, { runId: 'run_1', outcome: 'allowed', timestamp: now });

      const summaries = agentSummaries(db);
      expect(summaries).toHaveLength(1);
      expect(summaries[0].agent).toBe('unknown');
    });

    it('computes compliance rate correctly', () => {
      const now = Date.now();

      insertSession(db, 'run_1', 'test-agent', now);
      insertEvent(db, { runId: 'run_1', kind: 'ActionAllowed', timestamp: now });
      // 7 allowed, 3 denied = 70% compliance
      for (let i = 0; i < 7; i++) {
        insertDecision(db, { runId: 'run_1', outcome: 'allowed', timestamp: now + i });
      }
      for (let i = 0; i < 3; i++) {
        insertDecision(db, { runId: 'run_1', outcome: 'denied', timestamp: now + 10 + i });
      }

      const summaries = agentSummaries(db);
      expect(summaries[0].complianceRate).toBe(70);
    });

    it('counts violations from InvariantViolation events', () => {
      const now = Date.now();

      insertSession(db, 'run_1', 'risky-agent', now);
      insertEvent(db, {
        runId: 'run_1',
        kind: 'InvariantViolation',
        timestamp: now + 1,
        data: { invariant: 'no-secret-exposure' },
      });
      insertEvent(db, {
        runId: 'run_1',
        kind: 'InvariantViolation',
        timestamp: now + 2,
        data: { invariant: 'protected-branch' },
      });
      insertDecision(db, { runId: 'run_1', outcome: 'denied', timestamp: now + 3 });

      const summaries = agentSummaries(db);
      expect(summaries[0].violations).toBe(2);
    });

    it('sorts agents by session count descending', () => {
      const now = Date.now();

      insertSession(db, 'run_1', 'few-sessions', now);
      insertEvent(db, { runId: 'run_1', kind: 'ActionAllowed', timestamp: now });
      insertDecision(db, { runId: 'run_1', outcome: 'allowed', timestamp: now });

      insertSession(db, 'run_2', 'many-sessions', now + 1);
      insertEvent(db, { runId: 'run_2', kind: 'ActionAllowed', timestamp: now + 1 });
      insertDecision(db, { runId: 'run_2', outcome: 'allowed', timestamp: now + 1 });

      insertSession(db, 'run_3', 'many-sessions', now + 2);
      insertEvent(db, { runId: 'run_3', kind: 'ActionAllowed', timestamp: now + 2 });
      insertDecision(db, { runId: 'run_3', outcome: 'allowed', timestamp: now + 2 });

      const summaries = agentSummaries(db);
      expect(summaries[0].agent).toBe('many-sessions');
      expect(summaries[1].agent).toBe('few-sessions');
    });
  });

  describe('teamReport', () => {
    it('returns a complete report structure', () => {
      const now = Date.now();

      insertSession(db, 'run_1', 'dev-agent', now);
      insertEvent(db, {
        runId: 'run_1',
        kind: 'ActionAllowed',
        timestamp: now + 1,
      });
      insertDecision(db, { runId: 'run_1', outcome: 'allowed', timestamp: now + 1 });

      const report = teamReport(db);

      expect(report.overview).toBeDefined();
      expect(report.overview.totalSessions).toBeGreaterThan(0);
      expect(report.agents).toHaveLength(1);
      expect(report.agents[0].agent).toBe('dev-agent');
      expect(report.topDeniedActions).toBeDefined();
      expect(report.topViolatedInvariants).toBeDefined();
      expect(report.denialTrends).toBeDefined();
    });

    it('returns empty report for empty database', () => {
      const report = teamReport(db);

      expect(report.overview.totalSessions).toBe(0);
      expect(report.overview.totalEvents).toBe(0);
      expect(report.agents).toEqual([]);
    });

    it('aggregates across multiple agents', () => {
      const now = Date.now();

      // Two agents, each with one session
      insertSession(db, 'run_1', 'agent-a', now);
      insertEvent(db, { runId: 'run_1', kind: 'ActionAllowed', timestamp: now });
      insertDecision(db, { runId: 'run_1', outcome: 'allowed', timestamp: now });

      insertSession(db, 'run_2', 'agent-b', now + 1);
      insertEvent(db, { runId: 'run_2', kind: 'ActionDenied', timestamp: now + 1 });
      insertDecision(db, { runId: 'run_2', outcome: 'denied', timestamp: now + 1 });
      insertDecision(db, {
        runId: 'run_2',
        outcome: 'denied',
        actionType: 'git.push',
        reason: 'policy deny',
        timestamp: now + 2,
      });

      const report = teamReport(db);

      expect(report.overview.totalDecisions).toBe(3);
      expect(report.agents).toHaveLength(2);
      expect(report.topDeniedActions.length).toBeGreaterThan(0);
    });

    it('respects time filter', () => {
      const now = Date.now();
      const oneHourAgo = now - 3_600_000;
      const twoHoursAgo = now - 7_200_000;

      insertSession(db, 'run_old', 'old-agent', twoHoursAgo);
      insertEvent(db, { runId: 'run_old', kind: 'ActionAllowed', timestamp: twoHoursAgo });
      insertDecision(db, { runId: 'run_old', outcome: 'allowed', timestamp: twoHoursAgo });

      insertSession(db, 'run_new', 'new-agent', now);
      insertEvent(db, { runId: 'run_new', kind: 'ActionAllowed', timestamp: now });
      insertDecision(db, { runId: 'run_new', outcome: 'allowed', timestamp: now });

      const report = teamReport(db, { since: oneHourAgo });

      // Should only include the recent agent
      expect(report.agents).toHaveLength(1);
      expect(report.agents[0].agent).toBe('new-agent');
    });
  });
});
