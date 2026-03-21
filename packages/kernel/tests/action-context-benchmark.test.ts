import { describe, it, expect } from 'vitest';
import { normalizeIntent } from '@red-codes/kernel';
import type { RawAgentAction } from '@red-codes/kernel';

describe('KE-2: ActionContext normalization benchmark', () => {
  it('normalizes intent (including ActionContext) within 100µs at p50', () => {
    const raw: RawAgentAction = {
      tool: 'Write',
      file: 'src/components/Button.tsx',
      content: 'export const Button = () => <button>Click</button>;',
      agent: 'claude-code:session-abc123',
      persona: { trustTier: 'standard', role: 'developer' },
      filesAffected: 1,
      metadata: {
        hook: 'PreToolUse',
        sessionId: 'sess-benchmark-001',
        worktree: '/project/.claude/worktrees/feature-branch',
        timestamp: Date.now(),
      },
    };

    // Warm up (JIT compilation, V8 optimization)
    for (let i = 0; i < 100; i++) {
      normalizeIntent(raw);
    }

    // Measure
    const iterations = 1000;
    const durations: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      normalizeIntent(raw);
      const end = performance.now();
      durations.push((end - start) * 1000); // Convert to µs
    }

    durations.sort((a, b) => a - b);
    const p50 = durations[Math.floor(iterations * 0.5)]!;
    const p95 = durations[Math.floor(iterations * 0.95)]!;
    const p99 = durations[Math.floor(iterations * 0.99)]!;

    // SLO: p50 < 100µs
    expect(p50).toBeLessThan(100);

    // Log for visibility (won't fail tests but useful for CI reporting)
    console.log(
      `ActionContext normalization: p50=${p50.toFixed(1)}µs, p95=${p95.toFixed(1)}µs, p99=${p99.toFixed(1)}µs`
    );
  });

  it('normalizes git action (Bash → git.push) within 100µs at p50', () => {
    const raw: RawAgentAction = {
      tool: 'Bash',
      command: 'git push origin feature-branch',
      agent: 'claude-code:session-def456',
      metadata: { sessionId: 'sess-git-001', timestamp: Date.now() },
    };

    // Warm up
    for (let i = 0; i < 100; i++) {
      normalizeIntent(raw);
    }

    const iterations = 1000;
    const durations: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      normalizeIntent(raw);
      const end = performance.now();
      durations.push((end - start) * 1000);
    }

    durations.sort((a, b) => a - b);
    const p50 = durations[Math.floor(iterations * 0.5)]!;

    expect(p50).toBeLessThan(100);

    console.log(`Git action normalization: p50=${p50.toFixed(1)}µs`);
  });
});
