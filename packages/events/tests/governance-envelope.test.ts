import { describe, it, expect, beforeEach } from 'vitest';
import type { DomainEvent, GovernanceEventEnvelope } from '@red-codes/core';
import { ENVELOPE_SCHEMA_VERSION } from '@red-codes/core';
import {
  createEvent,
  createEnvelope,
  isEnvelope,
  unwrapEnvelope,
  validateEnvelope,
  resetEventCounter,
  resetEnvelopeCounter,
  POLICY_DENIED,
  ACTION_ALLOWED,
  ACTION_DENIED,
} from '../src/schema.js';

function makeEvent(kind: DomainEvent['kind'] = 'ActionRequested'): DomainEvent {
  return createEvent(kind, {
    actionType: 'file.write',
    target: '/src/index.ts',
    justification: 'test',
  });
}

describe('GovernanceEventEnvelope', () => {
  beforeEach(() => {
    resetEventCounter();
    resetEnvelopeCounter();
  });

  describe('createEnvelope', () => {
    it('wraps a DomainEvent with versioned envelope metadata', () => {
      const event = makeEvent();
      const envelope = createEnvelope(event, { source: 'claude-code' });

      expect(envelope.schemaVersion).toBe(ENVELOPE_SCHEMA_VERSION);
      expect(envelope.envelopeId).toMatch(/^env_\d+_1$/);
      expect(envelope.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(envelope.source).toBe('claude-code');
      expect(envelope.policyVersion).toBeNull();
      expect(envelope.decisionCodes).toEqual([]);
      expect(envelope.performanceMetrics).toEqual({});
      expect(envelope.event).toBe(event);
    });

    it('includes policyVersion when provided', () => {
      const event = makeEvent();
      const envelope = createEnvelope(event, {
        source: 'copilot-cli',
        policyVersion: 'policy-v2.1',
      });

      expect(envelope.policyVersion).toBe('policy-v2.1');
    });

    it('includes decisionCodes when provided', () => {
      const event = makeEvent();
      const envelope = createEnvelope(event, {
        source: 'claude-code',
        decisionCodes: ['allow', 'escalate'],
      });

      expect(envelope.decisionCodes).toEqual(['allow', 'escalate']);
    });

    it('includes performanceMetrics when provided', () => {
      const event = makeEvent();
      const envelope = createEnvelope(event, {
        source: 'claude-code',
        performanceMetrics: {
          hookLatencyUs: 1500,
          evaluationLatencyUs: 800,
        },
      });

      expect(envelope.performanceMetrics.hookLatencyUs).toBe(1500);
      expect(envelope.performanceMetrics.evaluationLatencyUs).toBe(800);
    });

    it('assigns unique envelope IDs', () => {
      const event = makeEvent();
      const env1 = createEnvelope(event, { source: 'claude-code' });
      const env2 = createEnvelope(event, { source: 'claude-code' });

      expect(env1.envelopeId).not.toBe(env2.envelopeId);
    });

    it('produces identical structure regardless of source runtime', () => {
      const event = makeEvent();
      resetEnvelopeCounter();
      const claudeEnv = createEnvelope(event, {
        source: 'claude-code',
        policyVersion: 'v1',
        decisionCodes: ['allow'],
      });
      resetEnvelopeCounter();
      const copilotEnv = createEnvelope(event, {
        source: 'copilot-cli',
        policyVersion: 'v1',
        decisionCodes: ['allow'],
      });

      // Same schema, same structure — only source differs
      expect(claudeEnv.schemaVersion).toBe(copilotEnv.schemaVersion);
      expect(claudeEnv.decisionCodes).toEqual(copilotEnv.decisionCodes);
      expect(claudeEnv.event).toBe(copilotEnv.event);
      expect(claudeEnv.source).toBe('claude-code');
      expect(copilotEnv.source).toBe('copilot-cli');
    });
  });

  describe('isEnvelope', () => {
    it('returns true for valid envelopes', () => {
      const event = makeEvent();
      const envelope = createEnvelope(event, { source: 'claude-code' });

      expect(isEnvelope(envelope)).toBe(true);
    });

    it('returns false for plain DomainEvents', () => {
      const event = makeEvent();
      expect(isEnvelope(event)).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(isEnvelope(null)).toBe(false);
      expect(isEnvelope(undefined)).toBe(false);
    });

    it('returns false for non-objects', () => {
      expect(isEnvelope('string')).toBe(false);
      expect(isEnvelope(42)).toBe(false);
    });

    it('returns false for objects missing required fields', () => {
      expect(isEnvelope({ schemaVersion: '1.0.0' })).toBe(false);
      expect(isEnvelope({ schemaVersion: '1.0.0', envelopeId: 'env_1' })).toBe(false);
    });
  });

  describe('unwrapEnvelope', () => {
    it('extracts the inner DomainEvent from an envelope', () => {
      const event = makeEvent();
      const envelope = createEnvelope(event, { source: 'claude-code' });

      expect(unwrapEnvelope(envelope)).toBe(event);
    });

    it('returns a DomainEvent unchanged if not wrapped', () => {
      const event = makeEvent();
      expect(unwrapEnvelope(event)).toBe(event);
    });
  });

  describe('validateEnvelope', () => {
    it('validates a well-formed envelope', () => {
      const event = makeEvent();
      const envelope = createEnvelope(event, { source: 'claude-code' });
      const result = validateEnvelope(envelope);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects null', () => {
      const result = validateEnvelope(null);
      expect(result.valid).toBe(false);
    });

    it('rejects missing schemaVersion', () => {
      const result = validateEnvelope({
        envelopeId: 'env_1',
        timestamp: new Date().toISOString(),
        source: 'claude-code',
        decisionCodes: [],
        event: makeEvent(),
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('schemaVersion'))).toBe(true);
    });

    it('rejects missing source', () => {
      const result = validateEnvelope({
        schemaVersion: '1.0.0',
        envelopeId: 'env_1',
        timestamp: new Date().toISOString(),
        decisionCodes: [],
        event: makeEvent(),
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('source'))).toBe(true);
    });

    it('rejects missing event', () => {
      const result = validateEnvelope({
        schemaVersion: '1.0.0',
        envelopeId: 'env_1',
        timestamp: new Date().toISOString(),
        source: 'claude-code',
        decisionCodes: [],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('event'))).toBe(true);
    });

    it('validates the inner event and reports errors', () => {
      const result = validateEnvelope({
        schemaVersion: '1.0.0',
        envelopeId: 'env_1',
        timestamp: new Date().toISOString(),
        source: 'claude-code',
        decisionCodes: [],
        performanceMetrics: {},
        policyVersion: null,
        event: { kind: 'PolicyDenied' }, // Missing required fields
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('Inner event'))).toBe(true);
    });

    it('accepts envelope with full performance metrics', () => {
      const event = makeEvent();
      const envelope: GovernanceEventEnvelope = {
        schemaVersion: '1.0.0',
        envelopeId: 'env_1',
        timestamp: new Date().toISOString(),
        source: 'claude-code',
        policyVersion: 'v2',
        decisionCodes: ['allow'],
        performanceMetrics: { hookLatencyUs: 500, evaluationLatencyUs: 200 },
        event,
      };

      const result = validateEnvelope(envelope);
      expect(result.valid).toBe(true);
    });
  });

  describe('ENVELOPE_SCHEMA_VERSION', () => {
    it('is a valid semver string', () => {
      expect(ENVELOPE_SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('is 1.0.0 for the initial release', () => {
      expect(ENVELOPE_SCHEMA_VERSION).toBe('1.0.0');
    });
  });
});
