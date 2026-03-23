// SQLite event and decision sinks — write-only, append-only.
// Mirrors the JSONL sink pattern: swallows write errors, never crashes the kernel.

import type Database from 'better-sqlite3';
import type {
  DomainEvent,
  EventSink,
  GovernanceDecisionRecord,
  DecisionSink,
  GovernanceEventEnvelope,
} from '@red-codes/core';

/** Create an EventSink that writes events to the SQLite events table */
export function createSqliteEventSink(
  db: Database.Database,
  runId: string,
  onError?: (error: Error) => void
): EventSink {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO events (id, run_id, kind, timestamp, fingerprint, data, action_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  return {
    write(event: DomainEvent): void {
      try {
        const actionType = extractActionType(event);
        stmt.run(
          event.id,
          runId,
          event.kind,
          event.timestamp,
          event.fingerprint,
          JSON.stringify(event),
          actionType
        );
      } catch (err) {
        // Never crash the kernel — report via callback if available
        onError?.(err as Error);
      }
    },

    flush(): void {
      // No buffering needed — SQLite handles durability
    },
  };
}

/** Create a DecisionSink that writes decision records to the SQLite decisions table */
export function createSqliteDecisionSink(
  db: Database.Database,
  runId: string,
  onError?: (error: Error) => void
): DecisionSink {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO decisions (record_id, run_id, timestamp, outcome, action_type, target, reason, data, severity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return {
    write(record: GovernanceDecisionRecord): void {
      try {
        const severity = record.policy?.severity ?? null;
        stmt.run(
          record.recordId,
          runId,
          record.timestamp,
          record.outcome,
          record.action.type,
          record.action.target,
          record.reason,
          JSON.stringify(record),
          severity
        );
      } catch (err) {
        // Never crash the kernel — report via callback if available
        onError?.(err as Error);
      }
    },

    flush(): void {
      // No buffering needed
    },
  };
}

/** Extract actionType from event payload if present (reference monitor events) */
function extractActionType(event: DomainEvent): string | null {
  const rec = event as unknown as Record<string, unknown>;
  if (typeof rec.actionType === 'string') return rec.actionType;
  return null;
}

/** Sink interface for GovernanceEventEnvelopes — writes both envelope metadata and the inner event */
export interface EnvelopeSink {
  write(envelope: GovernanceEventEnvelope): void;
  flush?(): void;
}

/**
 * Create an EnvelopeSink that writes envelopes to SQLite.
 *
 * Persists the inner event to the standard events table and additionally stores
 * envelope-level metadata (schema_version, source, policy_version, decision_codes,
 * performance_metrics) in the envelope_data column.
 *
 * The events table INSERT uses the existing schema — envelope metadata is stored as
 * a JSON string in the `data` column alongside the raw event. This keeps the migration
 * path simple: no schema changes required for envelope support.
 */
export function createSqliteEnvelopeSink(
  db: Database.Database,
  runId: string,
  onError?: (error: Error) => void
): EnvelopeSink {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO events (id, run_id, kind, timestamp, fingerprint, data, action_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  return {
    write(envelope: GovernanceEventEnvelope): void {
      try {
        const event = envelope.event;
        const actionType = extractActionType(event);
        // Store the full envelope (including inner event) in the data column
        stmt.run(
          event.id,
          runId,
          event.kind,
          event.timestamp,
          event.fingerprint,
          JSON.stringify(envelope),
          actionType
        );
      } catch (err) {
        onError?.(err as Error);
      }
    },

    flush(): void {
      // No buffering needed
    },
  };
}
