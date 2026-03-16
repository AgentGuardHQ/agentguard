import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import type { AgentEvent } from '../src/event-mapper.js';
import { anonymizeEvent } from '../src/anonymize.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<AgentEvent> = {}): AgentEvent {
  return {
    eventId: 'evt_1',
    agentId: 'claude-agent-1',
    timestamp: '2024-03-10T00:00:00.000Z',
    eventType: 'tool_call',
    action: 'file.write',
    resource: '/home/user/secret-project/src/auth.ts',
    outcome: 'success',
    riskLevel: 'medium',
    metadata: { reason: 'matched capability', extra: 'sensitive-info' },
    policyVersion: 'policy-v2',
    sessionId: 'session_abc',
    ...overrides,
  };
}

function expectedHash(installId: string, agentId: string): string {
  return createHash('sha256')
    .update(installId + agentId)
    .digest('hex');
}

// ---------------------------------------------------------------------------
// anonymizeEvent
// ---------------------------------------------------------------------------

describe('anonymizeEvent', () => {
  const installId = 'install_xyz_123';

  it('strips resource to basename (Unix path)', () => {
    const event = makeEvent({ resource: '/home/user/secret-project/src/auth.ts' });
    const result = anonymizeEvent(event, installId);

    expect(result.resource).toBe('auth.ts');
  });

  it('hashes agentId with installId (result is 64-char hex)', () => {
    const event = makeEvent({ agentId: 'claude-agent-1' });
    const result = anonymizeEvent(event, installId);

    expect(result.agentId).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces consistent hashes for the same agent + install', () => {
    const event = makeEvent({ agentId: 'claude-agent-1' });
    const result1 = anonymizeEvent(event, installId);
    const result2 = anonymizeEvent(event, installId);

    expect(result1.agentId).toBe(result2.agentId);
    expect(result1.agentId).toBe(expectedHash(installId, 'claude-agent-1'));
  });

  it('produces different hashes for different installs', () => {
    const event = makeEvent({ agentId: 'claude-agent-1' });
    const result1 = anonymizeEvent(event, 'install_aaa');
    const result2 = anonymizeEvent(event, 'install_bbb');

    expect(result1.agentId).not.toBe(result2.agentId);
  });

  it('strips metadata (becomes undefined)', () => {
    const event = makeEvent({
      metadata: { reason: 'sensitive', secret: 'token_xyz' },
    });
    const result = anonymizeEvent(event, installId);

    expect(result.metadata).toBeUndefined();
  });

  it('preserves eventType, action, outcome, riskLevel, sessionId', () => {
    const event = makeEvent({
      eventType: 'decision',
      action: 'git.push',
      outcome: 'denied',
      riskLevel: 'high',
      sessionId: 'session_999',
      policyVersion: 'strict-v3',
    });
    const result = anonymizeEvent(event, installId);

    expect(result.eventType).toBe('decision');
    expect(result.action).toBe('git.push');
    expect(result.outcome).toBe('denied');
    expect(result.riskLevel).toBe('high');
    expect(result.sessionId).toBe('session_999');
    expect(result.policyVersion).toBe('strict-v3');
  });

  it('handles undefined resource gracefully', () => {
    const event = makeEvent({ resource: undefined });
    const result = anonymizeEvent(event, installId);

    expect(result.resource).toBeUndefined();
  });

  it('handles Windows paths (backslash separators)', () => {
    const event = makeEvent({ resource: 'C:\\Users\\user\\project\\src\\main.ts' });
    const result = anonymizeEvent(event, installId);

    expect(result.resource).toBe('main.ts');
  });
});
