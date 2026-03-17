import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEvent,
  validateEvent,
  resetEventCounter,
  ALL_EVENT_KINDS,
  INVARIANT_VIOLATION,
  PIPELINE_STARTED,
  POLICY_DENIED,
} from '@red-codes/events';

describe('domain/events', () => {
  beforeEach(() => {
    resetEventCounter();
  });

  describe('createEvent', () => {
    it('creates a valid PolicyDenied event', () => {
      const event = createEvent(POLICY_DENIED, {
        policy: 'no-force-push',
        action: 'git push --force',
        reason: 'Force push prohibited',
      });
      expect(event.kind).toBe('PolicyDenied');
      expect(event.id).toMatch(/^evt_\d+_1$/);
      expect(event.timestamp).toBeTypeOf('number');
      expect(event.fingerprint).toBeTypeOf('string');
    });

    it('assigns unique IDs via monotonic counter', () => {
      const e1 = createEvent(POLICY_DENIED, {
        policy: 'p1',
        action: 'a1',
        reason: 'r1',
      });
      const e2 = createEvent(POLICY_DENIED, {
        policy: 'p2',
        action: 'a2',
        reason: 'r2',
      });
      expect(e1.id).not.toBe(e2.id);
    });

    it('throws on unknown event kind', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => createEvent('UnknownKind' as any, {})).toThrow('Unknown event kind');
    });

    it('throws when required fields are missing', () => {
      expect(() => createEvent(POLICY_DENIED, {})).toThrow('missing required field: policy');
    });

    it('generates deterministic fingerprints for same kind+data', () => {
      const data = {
        invariant: 'no-secret-exposure',
        expected: 'No sensitive files',
        actual: 'Found .env',
      };
      const e1 = createEvent(INVARIANT_VIOLATION, data);
      resetEventCounter();
      const e2 = createEvent(INVARIANT_VIOLATION, data);
      expect(e1.fingerprint).toBe(e2.fingerprint);
    });

    it('creates governance events', () => {
      const event = createEvent(INVARIANT_VIOLATION, {
        invariant: 'no-secret-exposure',
        expected: 'No sensitive files',
        actual: 'Found .env',
      });
      expect(event.kind).toBe('InvariantViolation');
    });

    it('creates pipeline events', () => {
      const event = createEvent(PIPELINE_STARTED, {
        runId: 'run_1',
        task: 'build feature',
      });
      expect(event.kind).toBe('PipelineStarted');
    });
  });

  describe('validateEvent', () => {
    it('validates a well-formed event', () => {
      const result = validateEvent({
        kind: POLICY_DENIED,
        policy: 'no-force-push',
        action: 'git push --force',
        reason: 'Force push prohibited',
        timestamp: Date.now(),
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects null', () => {
      const result = validateEvent(null as unknown as Record<string, unknown>);
      expect(result.valid).toBe(false);
    });

    it('rejects missing kind', () => {
      const result = validateEvent({ message: 'test' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('kind');
    });

    it('rejects unknown kind', () => {
      const result = validateEvent({ kind: 'FakeEvent' });
      expect(result.valid).toBe(false);
    });

    it('reports missing required fields', () => {
      const result = validateEvent({ kind: POLICY_DENIED });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('ALL_EVENT_KINDS', () => {
    it('contains all known event kinds', () => {
      expect(ALL_EVENT_KINDS.size).toBeGreaterThan(20);
      expect(ALL_EVENT_KINDS.has('InvariantViolation')).toBe(true);
      expect(ALL_EVENT_KINDS.has('PolicyDenied')).toBe(true);
      expect(ALL_EVENT_KINDS.has('ActionRequested')).toBe(true);
    });
  });
});
