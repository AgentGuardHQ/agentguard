import { describe, it, expect } from 'vitest';
import { evaluate, matchContextCondition } from '@red-codes/policy';
import type { NormalizedIntent, LoadedPolicy, ContextCondition } from '@red-codes/policy';
import type { ActionContext } from '@red-codes/core';

function makeContext(overrides: Partial<ActionContext> = {}): ActionContext {
  return {
    actor: { agentId: 'claude-code:abc123', ...overrides.actor },
    action: { type: 'file.write', category: 'file', originalTool: 'Write', ...overrides.action },
    args: { target: 'src/index.ts', ...overrides.args },
    ...overrides,
  };
}

function makeIntent(overrides: Partial<NormalizedIntent> = {}): NormalizedIntent {
  return {
    action: 'file.write',
    target: 'src/index.ts',
    agent: 'claude-code:abc123',
    destructive: false,
    context: makeContext(),
    ...overrides,
  };
}

function makePolicy(rules: LoadedPolicy['rules']): LoadedPolicy {
  return {
    id: 'test-policy',
    name: 'Test Policy',
    rules,
    severity: 3,
  };
}

describe('KE-2: ActionContext policy conditions', () => {
  describe('matchContextCondition', () => {
    it('returns false when context is undefined', () => {
      const cond: ContextCondition = { agentId: ['claude-code'] };
      expect(matchContextCondition(cond, undefined)).toBe(false);
    });

    it('matches agentId by substring', () => {
      const ctx = makeContext();
      expect(matchContextCondition({ agentId: ['claude-code'] }, ctx)).toBe(true);
      expect(matchContextCondition({ agentId: ['copilot'] }, ctx)).toBe(false);
    });

    it('matches action category', () => {
      const ctx = makeContext();
      expect(matchContextCondition({ category: ['file'] }, ctx)).toBe(true);
      expect(matchContextCondition({ category: ['git', 'shell'] }, ctx)).toBe(false);
    });

    it('matches originalTool', () => {
      const ctx = makeContext();
      expect(matchContextCondition({ originalTool: ['Write'] }, ctx)).toBe(true);
      expect(matchContextCondition({ originalTool: ['Bash'] }, ctx)).toBe(false);
    });

    it('matches inWorktree=true when worktree is set', () => {
      const ctx = makeContext({ actor: { agentId: 'a', worktree: '/tmp/wt' } });
      expect(matchContextCondition({ inWorktree: true }, ctx)).toBe(true);
      expect(matchContextCondition({ inWorktree: false }, ctx)).toBe(false);
    });

    it('matches inWorktree=false when worktree is not set', () => {
      const ctx = makeContext({ actor: { agentId: 'a' } });
      expect(matchContextCondition({ inWorktree: false }, ctx)).toBe(true);
      expect(matchContextCondition({ inWorktree: true }, ctx)).toBe(false);
    });

    it('matches with all conditions combined', () => {
      const ctx = makeContext({
        actor: { agentId: 'claude-code:xyz', worktree: '/wt' },
        action: { type: 'file.write', category: 'file', originalTool: 'Write' },
      });
      expect(
        matchContextCondition(
          { agentId: ['claude-code'], category: ['file'], originalTool: ['Write'], inWorktree: true },
          ctx
        )
      ).toBe(true);
    });

    it('fails when any sub-condition fails', () => {
      const ctx = makeContext({
        actor: { agentId: 'claude-code:xyz' },
        action: { type: 'file.write', category: 'file', originalTool: 'Write' },
      });
      // agentId matches but category does not
      expect(
        matchContextCondition({ agentId: ['claude-code'], category: ['git'] }, ctx)
      ).toBe(false);
    });
  });

  describe('evaluate with context conditions', () => {
    it('denies when context condition matches a deny rule', () => {
      const intent = makeIntent({
        context: makeContext({
          action: { type: 'file.write', category: 'file', originalTool: 'Write' },
        }),
      });
      const policy = makePolicy([
        {
          action: 'file.write',
          effect: 'deny',
          conditions: {
            context: { originalTool: ['Write'] },
          },
          reason: 'Write tool blocked by context rule',
        },
      ]);

      const result = evaluate(intent, [policy]);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Write tool blocked by context rule');
    });

    it('allows when context condition matches an allow rule', () => {
      const intent = makeIntent({
        context: makeContext({
          actor: { agentId: 'claude-code:trusted' },
        }),
      });
      const policy = makePolicy([
        {
          action: 'file.*',
          effect: 'allow',
          conditions: {
            context: { agentId: ['claude-code'] },
          },
          reason: 'Claude Code agents allowed for file ops',
        },
      ]);

      const result = evaluate(intent, [policy]);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('Claude Code agents allowed for file ops');
    });

    it('skips rule when context condition does not match', () => {
      const intent = makeIntent({
        context: makeContext({
          actor: { agentId: 'copilot:session1' },
        }),
      });
      const policy = makePolicy([
        {
          action: 'file.*',
          effect: 'deny',
          conditions: {
            context: { agentId: ['claude-code'] },
          },
          reason: 'Only blocks Claude agents',
        },
        {
          action: '*',
          effect: 'allow',
          reason: 'Default allow',
        },
      ]);

      const result = evaluate(intent, [policy]);
      expect(result.allowed).toBe(true);
    });

    it('denies worktree-only actions when not in a worktree', () => {
      const intent = makeIntent({
        action: 'git.push',
        context: makeContext({
          actor: { agentId: 'agent-1' },
          action: { type: 'git.push', category: 'git' },
        }),
      });
      const policy = makePolicy([
        {
          action: 'git.push',
          effect: 'deny',
          conditions: {
            context: { inWorktree: false },
          },
          reason: 'Push only allowed from worktrees',
        },
        {
          action: '*',
          effect: 'allow',
        },
      ]);

      const result = evaluate(intent, [policy]);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Push only allowed from worktrees');
    });

    it('records contextMatched in evaluation trace', () => {
      const intent = makeIntent({
        context: makeContext({
          action: { type: 'file.write', category: 'file', originalTool: 'Write' },
        }),
      });
      const policy = makePolicy([
        {
          action: 'file.write',
          effect: 'deny',
          conditions: {
            context: { category: ['file'] },
          },
          reason: 'denied',
        },
      ]);

      const result = evaluate(intent, [policy]);
      expect(result.trace).toBeDefined();
      const matchedRule = result.trace!.rulesEvaluated.find((r) => r.outcome === 'match');
      expect(matchedRule).toBeDefined();
      expect(matchedRule!.conditionDetails.contextMatched).toBe(true);
    });

    it('works without context (backward compatibility)', () => {
      const intent: NormalizedIntent = {
        action: 'file.write',
        target: 'src/app.ts',
        agent: 'test',
        destructive: false,
        // No context field
      };
      const policy = makePolicy([
        {
          action: 'file.*',
          effect: 'allow',
          reason: 'Allowed',
        },
      ]);

      const result = evaluate(intent, [policy]);
      expect(result.allowed).toBe(true);
    });

    it('denies when context is missing but context condition is set', () => {
      const intent: NormalizedIntent = {
        action: 'file.write',
        target: 'src/app.ts',
        agent: 'test',
        destructive: false,
        // No context — rule with context condition should not match
      };
      const policy = makePolicy([
        {
          action: 'file.*',
          effect: 'allow',
          conditions: {
            context: { agentId: ['claude-code'] },
          },
          reason: 'Only for Claude',
        },
      ]);

      // Allow rule with context condition won't match (no context) → default deny
      const result = evaluate(intent, [policy]);
      expect(result.allowed).toBe(false);
    });
  });
});
