import { describe, it, expect, beforeEach } from 'vitest';
import type { DomainEvent } from '@red-codes/core';
import { ENVELOPE_SCHEMA_VERSION } from '@red-codes/core';
import { resetEventCounter, resetEnvelopeCounter, createEvent } from '@red-codes/events';
import { claudeCodeToEnvelope, copilotCliToEnvelope } from '@red-codes/adapters';

function makeEvent(): DomainEvent {
  return createEvent('ActionAllowed', {
    actionType: 'file.write',
    target: '/src/index.ts',
    capability: 'file-ops',
  });
}

describe('claudeCodeToEnvelope', () => {
  beforeEach(() => {
    resetEventCounter();
    resetEnvelopeCounter();
  });

  it('wraps a DomainEvent with claude-code as source', () => {
    const event = makeEvent();
    const envelope = claudeCodeToEnvelope(event);

    expect(envelope.source).toBe('claude-code');
    expect(envelope.schemaVersion).toBe(ENVELOPE_SCHEMA_VERSION);
    expect(envelope.event).toBe(event);
    expect(envelope.policyVersion).toBeNull();
    expect(envelope.decisionCodes).toEqual([]);
    expect(envelope.performanceMetrics).toEqual({});
  });

  it('passes policyVersion through', () => {
    const event = makeEvent();
    const envelope = claudeCodeToEnvelope(event, { policyVersion: 'strict-v2' });

    expect(envelope.policyVersion).toBe('strict-v2');
  });

  it('passes decisionCodes through', () => {
    const event = makeEvent();
    const envelope = claudeCodeToEnvelope(event, { decisionCodes: ['deny'] });

    expect(envelope.decisionCodes).toEqual(['deny']);
  });

  it('passes performanceMetrics through', () => {
    const event = makeEvent();
    const envelope = claudeCodeToEnvelope(event, {
      performanceMetrics: { hookLatencyUs: 2000 },
    });

    expect(envelope.performanceMetrics.hookLatencyUs).toBe(2000);
  });
});

describe('copilotCliToEnvelope', () => {
  beforeEach(() => {
    resetEventCounter();
    resetEnvelopeCounter();
  });

  it('wraps a DomainEvent with copilot-cli as source', () => {
    const event = makeEvent();
    const envelope = copilotCliToEnvelope(event);

    expect(envelope.source).toBe('copilot-cli');
    expect(envelope.schemaVersion).toBe(ENVELOPE_SCHEMA_VERSION);
    expect(envelope.event).toBe(event);
  });

  it('passes options through', () => {
    const event = makeEvent();
    const envelope = copilotCliToEnvelope(event, {
      policyVersion: 'ci-policy-v1',
      decisionCodes: ['allow', 'escalate'],
      performanceMetrics: { hookLatencyUs: 500, evaluationLatencyUs: 300 },
    });

    expect(envelope.policyVersion).toBe('ci-policy-v1');
    expect(envelope.decisionCodes).toEqual(['allow', 'escalate']);
    expect(envelope.performanceMetrics.hookLatencyUs).toBe(500);
    expect(envelope.performanceMetrics.evaluationLatencyUs).toBe(300);
  });
});

describe('cross-runtime envelope compatibility', () => {
  beforeEach(() => {
    resetEventCounter();
    resetEnvelopeCounter();
  });

  it('produces structurally identical envelopes from different adapters', () => {
    const event = makeEvent();

    resetEnvelopeCounter();
    const claudeEnv = claudeCodeToEnvelope(event, {
      policyVersion: 'v1',
      decisionCodes: ['allow'],
      performanceMetrics: { hookLatencyUs: 1000 },
    });

    resetEnvelopeCounter();
    const copilotEnv = copilotCliToEnvelope(event, {
      policyVersion: 'v1',
      decisionCodes: ['allow'],
      performanceMetrics: { hookLatencyUs: 1000 },
    });

    // Same schema version
    expect(claudeEnv.schemaVersion).toBe(copilotEnv.schemaVersion);
    // Same event payload
    expect(claudeEnv.event).toBe(copilotEnv.event);
    // Same policy context
    expect(claudeEnv.policyVersion).toBe(copilotEnv.policyVersion);
    expect(claudeEnv.decisionCodes).toEqual(copilotEnv.decisionCodes);
    // Only source differs
    expect(claudeEnv.source).toBe('claude-code');
    expect(copilotEnv.source).toBe('copilot-cli');
  });
});
