// Tests for session metrics collector
import { describe, it, expect, vi } from 'vitest';
import { createSessionMetricsCollector } from '../src/session-metrics.js';
import type { GovernanceDecisionRecord } from '@red-codes/core';
import type { TelemetryClient } from '@red-codes/telemetry-client';

function makeRecord(
  overrides: Partial<GovernanceDecisionRecord> = {}
): GovernanceDecisionRecord {
  return {
    recordId: 'dec_1',
    runId: 'run_1',
    timestamp: 1700000000000,
    action: { type: 'file.read', target: 'src/index.ts', agent: 'agent', destructive: false },
    outcome: 'allow',
    reason: 'Allowed',
    intervention: null,
    policy: { matchedPolicyId: null, matchedPolicyName: null, severity: 0 },
    invariants: { allHold: true, violations: [] },
    simulation: null,
    evidencePackId: null,
    monitor: { escalationLevel: 'NORMAL', totalEvaluations: 1, totalDenials: 0 },
    execution: { executed: false, success: null, durationMs: null, error: null },
    ...overrides,
  } as GovernanceDecisionRecord;
}

function mockClient(): TelemetryClient {
  return {
    track: vi.fn(),
    enroll: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    status: vi.fn().mockReturnValue({ mode: 'anonymous', installId: 'test', enrolled: false, queueSize: 0, queueSizeBytes: 0 }),
    reset: vi.fn(),
  };
}

describe('createSessionMetricsCollector', () => {
  it('starts with zero counts', () => {
    const collector = createSessionMetricsCollector();
    const summary = collector.getSummary();
    expect(summary.total_actions).toBe(0);
    expect(summary.allowed_actions).toBe(0);
    expect(summary.denied_actions).toBe(0);
    expect(summary.invariant_violations).toBe(0);
  });

  it('counts allowed and denied actions', () => {
    const collector = createSessionMetricsCollector();

    collector.record(makeRecord({ outcome: 'allow' }));
    collector.record(makeRecord({ outcome: 'allow' }));
    collector.record(makeRecord({ outcome: 'deny' }));

    const summary = collector.getSummary();
    expect(summary.total_actions).toBe(3);
    expect(summary.allowed_actions).toBe(2);
    expect(summary.denied_actions).toBe(1);
  });

  it('counts invariant violations', () => {
    const collector = createSessionMetricsCollector();

    collector.record(
      makeRecord({
        invariants: {
          allHold: false,
          violations: [
            { invariantId: 'inv1', name: 'test', severity: 5, expected: 'a', actual: 'b' },
            { invariantId: 'inv2', name: 'test2', severity: 3, expected: 'x', actual: 'y' },
          ],
        },
      })
    );

    expect(collector.getSummary().invariant_violations).toBe(2);
  });

  it('tracks tool usage distribution', () => {
    const collector = createSessionMetricsCollector();

    collector.record(makeRecord({ action: { type: 'file.read', target: 'a', agent: 'a', destructive: false } }));
    collector.record(makeRecord({ action: { type: 'file.read', target: 'b', agent: 'a', destructive: false } }));
    collector.record(makeRecord({ action: { type: 'shell.exec', target: 'c', agent: 'a', destructive: false } }));

    const summary = collector.getSummary();
    expect(summary.unique_action_types).toBe(2);
    expect(summary.tool_usage['file.read']).toBe(2);
    expect(summary.tool_usage['shell.exec']).toBe(1);
  });

  it('tracks policy hit distribution', () => {
    const collector = createSessionMetricsCollector();

    collector.record(
      makeRecord({ policy: { matchedPolicyId: 'policy-a', matchedPolicyName: 'A', severity: 5 } })
    );
    collector.record(
      makeRecord({ policy: { matchedPolicyId: 'policy-a', matchedPolicyName: 'A', severity: 5 } })
    );
    collector.record(
      makeRecord({ policy: { matchedPolicyId: 'policy-b', matchedPolicyName: 'B', severity: 3 } })
    );

    const summary = collector.getSummary();
    expect(summary.unique_policy_hits).toBe(2);
    expect(summary.policy_hits['policy-a']).toBe(2);
    expect(summary.policy_hits['policy-b']).toBe(1);
  });

  it('tracks escalation peak', () => {
    const collector = createSessionMetricsCollector();

    collector.record(makeRecord({ monitor: { escalationLevel: 'NORMAL', totalEvaluations: 1, totalDenials: 0 } }));
    collector.record(makeRecord({ monitor: { escalationLevel: 'HIGH', totalEvaluations: 2, totalDenials: 1 } }));
    collector.record(makeRecord({ monitor: { escalationLevel: 'ELEVATED', totalEvaluations: 3, totalDenials: 1 } }));

    expect(collector.getSummary().escalation_peak).toBe(2);
  });

  it('counts destructive actions', () => {
    const collector = createSessionMetricsCollector();

    collector.record(makeRecord({ action: { type: 'file.delete', target: 'a', agent: 'a', destructive: true } }));
    collector.record(makeRecord({ action: { type: 'file.read', target: 'b', agent: 'a', destructive: false } }));

    expect(collector.getSummary().destructive_action_count).toBe(1);
  });

  it('counts bypass attempts', () => {
    const collector = createSessionMetricsCollector();

    collector.recordBypass();
    collector.recordBypass();

    expect(collector.getSummary().bypass_attempts).toBe(2);
  });

  it('emits summary event via telemetry client', () => {
    const collector = createSessionMetricsCollector();
    const client = mockClient();

    collector.record(makeRecord({ outcome: 'allow' }));
    collector.record(makeRecord({ outcome: 'deny' }));
    collector.emitSummary(client);

    expect(client.track).toHaveBeenCalledTimes(1);
    const tracked = (client.track as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(tracked.event_type).toBe('session_summary');
    expect(tracked.total_actions).toBe(2);
  });

  it('does not throw if client.track fails', () => {
    const collector = createSessionMetricsCollector();
    const client = mockClient();
    (client.track as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Network error');
    });

    expect(() => collector.emitSummary(client)).not.toThrow();
  });
});
