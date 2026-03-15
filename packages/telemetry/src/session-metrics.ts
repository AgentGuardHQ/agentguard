// Session metrics collector — accumulates per-session statistics
// and emits a summary telemetry event on session end.

import type { GovernanceDecisionRecord } from '@red-codes/core';
import type { TelemetryClient, TrackableEvent } from '@red-codes/telemetry-client';

export interface SessionMetrics {
  total_actions: number;
  allowed_actions: number;
  denied_actions: number;
  invariant_violations: number;
  unique_policy_hits: number;
  unique_action_types: number;
  tool_usage: Record<string, number>;
  policy_hits: Record<string, number>;
  escalation_peak: number;
  destructive_action_count: number;
  bypass_attempts: number;
  session_duration_ms: number;
}

export interface SessionMetricsCollector {
  record(record: GovernanceDecisionRecord): void;
  recordBypass(): void;
  getSummary(): SessionMetrics;
  emitSummary(client: TelemetryClient): void;
}

export function createSessionMetricsCollector(): SessionMetricsCollector {
  const startTime = Date.now();
  let totalActions = 0;
  let allowedActions = 0;
  let deniedActions = 0;
  let invariantViolations = 0;
  let destructiveActionCount = 0;
  let bypassAttempts = 0;
  let escalationPeak = 0;
  const policyHits = new Map<string, number>();
  const toolUsage = new Map<string, number>();

  return {
    record(record: GovernanceDecisionRecord): void {
      totalActions++;

      if (record.outcome === 'allow') {
        allowedActions++;
      } else {
        deniedActions++;
      }

      invariantViolations += record.invariants.violations.length;

      if (record.action.destructive) {
        destructiveActionCount++;
      }

      // Track tool usage
      const actionType = record.action.type;
      toolUsage.set(actionType, (toolUsage.get(actionType) ?? 0) + 1);

      // Track policy hits
      const policyId = record.policy.matchedPolicyId;
      if (policyId) {
        policyHits.set(policyId, (policyHits.get(policyId) ?? 0) + 1);
      }

      // Track escalation peak
      const level =
        typeof record.monitor.escalationLevel === 'number'
          ? record.monitor.escalationLevel
          : escalationLevelToNumber(record.monitor.escalationLevel);
      if (level > escalationPeak) {
        escalationPeak = level;
      }
    },

    recordBypass(): void {
      bypassAttempts++;
    },

    getSummary(): SessionMetrics {
      return {
        total_actions: totalActions,
        allowed_actions: allowedActions,
        denied_actions: deniedActions,
        invariant_violations: invariantViolations,
        unique_policy_hits: policyHits.size,
        unique_action_types: toolUsage.size,
        tool_usage: Object.fromEntries(toolUsage),
        policy_hits: Object.fromEntries(policyHits),
        escalation_peak: escalationPeak,
        destructive_action_count: destructiveActionCount,
        bypass_attempts: bypassAttempts,
        session_duration_ms: Date.now() - startTime,
      };
    },

    emitSummary(client: TelemetryClient): void {
      const summary = this.getSummary();

      try {
        client.track({
          runtime: 'claude-code',
          environment: 'local',
          event_type: 'session_summary',
          policy: `actions:${summary.total_actions},denied:${summary.denied_actions}`,
          result: summary.denied_actions > 0 ? 'denied' : 'allowed',
          latency_ms: summary.session_duration_ms,
          // Enriched fields flow through JSON serialization
          ...summary,
        } as TrackableEvent);
      } catch {
        // Summary emission is non-fatal
      }
    },
  };
}

function escalationLevelToNumber(level: string | number): number {
  if (typeof level === 'number') return level;
  switch (level) {
    case 'NORMAL':
      return 0;
    case 'ELEVATED':
      return 1;
    case 'HIGH':
      return 2;
    case 'LOCKDOWN':
      return 3;
    default:
      return 0;
  }
}
