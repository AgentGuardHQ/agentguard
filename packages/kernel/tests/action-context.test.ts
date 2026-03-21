import { describe, it, expect } from 'vitest';
import { normalizeIntent } from '@red-codes/kernel';
import type { RawAgentAction } from '@red-codes/kernel';

describe('KE-2: ActionContext normalization', () => {
  describe('normalizeIntent builds ActionContext', () => {
    it('produces context for a file.write action', () => {
      const raw: RawAgentAction = {
        tool: 'Write',
        file: 'src/index.ts',
        agent: 'claude-code:abc',
        metadata: { sessionId: 'sess-123', worktree: '/tmp/wt' },
      };
      const intent = normalizeIntent(raw);

      expect(intent.context).toBeDefined();
      expect(intent.context!.actor.agentId).toBe('claude-code:abc');
      expect(intent.context!.actor.sessionId).toBe('sess-123');
      expect(intent.context!.actor.worktree).toBe('/tmp/wt');
      expect(intent.context!.action.type).toBe('file.write');
      expect(intent.context!.action.category).toBe('file');
      expect(intent.context!.action.originalTool).toBe('Write');
      expect(intent.context!.args.target).toBe('src/index.ts');
    });

    it('produces context for a git.push action via Bash', () => {
      const raw: RawAgentAction = {
        tool: 'Bash',
        command: 'git push origin main',
        agent: 'claude-code:def',
        metadata: { sessionId: 'sess-456' },
      };
      const intent = normalizeIntent(raw);

      expect(intent.context).toBeDefined();
      expect(intent.context!.action.type).toBe('git.push');
      expect(intent.context!.action.category).toBe('git');
      expect(intent.context!.action.originalTool).toBe('Bash');
      expect(intent.context!.args.branch).toBe('main');
      expect(intent.context!.args.command).toBe('git push origin main');
    });

    it('produces context for shell.exec (non-git)', () => {
      const raw: RawAgentAction = {
        tool: 'Bash',
        command: 'npm install lodash',
        agent: 'copilot:xyz',
      };
      const intent = normalizeIntent(raw);

      expect(intent.context).toBeDefined();
      expect(intent.context!.action.type).toBe('shell.exec');
      expect(intent.context!.action.category).toBe('shell');
      expect(intent.context!.args.command).toBe('npm install lodash');
    });

    it('produces context for http.request via WebFetch', () => {
      const raw: RawAgentAction = {
        tool: 'WebFetch',
        target: 'https://example.com/api',
        agent: 'agent-1',
      };
      const intent = normalizeIntent(raw);

      expect(intent.context).toBeDefined();
      expect(intent.context!.action.type).toBe('http.request');
      expect(intent.context!.action.category).toBe('http');
      expect(intent.context!.args.target).toBe('https://example.com/api');
    });

    it('produces context for MCP tool calls', () => {
      const raw: RawAgentAction = {
        tool: 'mcp__scheduled-tasks__create_scheduled_task',
        agent: 'claude-code:ghi',
      };
      const intent = normalizeIntent(raw);

      expect(intent.context).toBeDefined();
      expect(intent.context!.action.type).toBe('mcp.call');
      // MCP calls fall back to shell class
      expect(intent.context!.action.category).toBe('shell');
      expect(intent.context!.action.originalTool).toBe(
        'mcp__scheduled-tasks__create_scheduled_task'
      );
    });

    it('handles null/undefined rawAction gracefully', () => {
      const intent = normalizeIntent(null);
      expect(intent.action).toBe('unknown');
      expect(intent.context).toBeUndefined();
    });

    it('defaults agent to unknown when not provided', () => {
      const raw: RawAgentAction = { tool: 'Read', file: 'test.ts' };
      const intent = normalizeIntent(raw);

      expect(intent.context).toBeDefined();
      expect(intent.context!.actor.agentId).toBe('unknown');
      expect(intent.context!.actor.sessionId).toBeUndefined();
    });

    it('captures worktree from metadata', () => {
      const raw: RawAgentAction = {
        tool: 'Write',
        file: 'src/foo.ts',
        agent: 'a',
        metadata: { worktree: '/project/.claude/worktrees/my-branch' },
      };
      const intent = normalizeIntent(raw);

      expect(intent.context!.actor.worktree).toBe('/project/.claude/worktrees/my-branch');
    });

    it('captures environment timestamp from metadata', () => {
      const ts = 1711029600000;
      const raw: RawAgentAction = {
        tool: 'Read',
        file: 'readme.md',
        agent: 'a',
        metadata: { timestamp: ts },
      };
      const intent = normalizeIntent(raw);

      expect(intent.context!.environment).toBeDefined();
      expect(intent.context!.environment!.timestamp).toBe(ts);
    });
  });

  describe('backward compatibility', () => {
    it('preserves all existing NormalizedIntent fields', () => {
      const raw: RawAgentAction = {
        tool: 'Write',
        file: 'src/app.ts',
        command: undefined,
        agent: 'claude-code:test',
        persona: { trustTier: 'standard', role: 'developer' },
        filesAffected: 3,
        metadata: { sessionId: 'sess-1' },
      };
      const intent = normalizeIntent(raw);

      expect(intent.action).toBe('file.write');
      expect(intent.target).toBe('src/app.ts');
      expect(intent.agent).toBe('claude-code:test');
      expect(intent.persona).toEqual({ trustTier: 'standard', role: 'developer' });
      expect(intent.filesAffected).toBe(3);
      expect(intent.metadata).toEqual({ sessionId: 'sess-1' });
      expect(intent.destructive).toBe(false);
      // context is additive — doesn't affect existing fields
      expect(intent.context).toBeDefined();
    });
  });
});
