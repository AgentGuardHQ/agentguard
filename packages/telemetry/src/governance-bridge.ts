// Governance telemetry bridge — DecisionSink that converts kernel
// GovernanceDecisionRecords into privacy-safe enriched telemetry events
// and feeds them to the telemetry-client for remote collection.

import type { GovernanceDecisionRecord, DecisionSink } from '@red-codes/core';
import type { TelemetryClient, TrackableEvent } from '@red-codes/telemetry-client';
import { sanitizeAction } from './sanitizer.js';
import type { BypassDetector } from './bypass-detector.js';
import type { SessionMetricsCollector } from './session-metrics.js';

export interface GovernanceBridgeConfig {
  client: TelemetryClient;
  runtime?: 'claude-code' | 'copilot' | 'ci' | 'unknown';
  environment?: 'local' | 'ci' | 'container';
  sessionMetrics?: SessionMetricsCollector;
  bypassDetector?: BypassDetector;
}

export function createGovernanceTelemetryBridge(config: GovernanceBridgeConfig): DecisionSink {
  const { client, runtime = 'unknown', environment = 'local' } = config;
  let actionIndex = 0;

  return {
    write(record: GovernanceDecisionRecord): void {
      try {
        actionIndex++;

        // Privacy-safe classification
        const sanitized = sanitizeAction(record);

        // Check for bypass patterns
        let bypassPattern: string | undefined;
        let bypassConfidence: number | undefined;
        if (config.bypassDetector) {
          const detection = config.bypassDetector.evaluate(record);
          if (detection) {
            bypassPattern = detection.patternId;
            bypassConfidence = detection.confidence;

            // Record in session metrics
            config.sessionMetrics?.recordBypass();

            // Emit a separate bypass event
            try {
              client.track({
                runtime,
                environment,
                event_type: 'bypass_detected',
                policy: detection.patternId,
                result: 'denied',
                latency_ms: 0,
                bypass_pattern: detection.patternId,
                bypass_confidence: detection.confidence,
              } as TrackableEvent);
            } catch {
              // Non-fatal
            }
          }
        }

        // Record in session metrics
        config.sessionMetrics?.record(record);

        // Build enriched event
        const event: TrackableEvent = {
          runtime,
          environment,
          event_type: record.outcome === 'allow' ? 'execution_allowed' : 'policy_denied',
          policy: record.policy.matchedPolicyId ?? record.reason ?? 'default',
          result: record.outcome === 'allow' ? 'allowed' : 'denied',
          latency_ms: record.execution.durationMs ?? 0,

          // Enriched fields (flow through JSON serialization)
          action_type: record.action.type,
          target_type: sanitized.target_type,
          target_hash: sanitized.target_hash,
          args_classification: sanitized.args_classification,
          destructive: record.action.destructive,
          policy_id: record.policy.matchedPolicyId ?? undefined,
          policy_severity: record.policy.severity,
          invariant_violations: record.invariants.violations.map((v) => v.invariantId),
          escalation_level:
            typeof record.monitor.escalationLevel === 'number'
              ? record.monitor.escalationLevel
              : escalationLevelToNumber(record.monitor.escalationLevel),
          blast_radius: record.simulation?.blastRadius,
          risk_level: record.simulation?.riskLevel,
          session_action_index: actionIndex,
          bypass_pattern: bypassPattern,
          bypass_confidence: bypassConfidence,
        } as TrackableEvent;

        client.track(event);
      } catch {
        // Bridge must never crash the kernel
      }
    },

    flush(): void {
      // Emit session summary on flush (called at session end)
      try {
        if (config.sessionMetrics) {
          config.sessionMetrics.emitSummary(client);
        }
      } catch {
        // Non-fatal
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
