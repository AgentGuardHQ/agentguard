import { describe, it, expect } from 'vitest';
import type { EnforcementMode, Suggestion } from '@red-codes/core';

describe('EnforcementMode', () => {
  it('accepts all four valid modes', () => {
    const modes: EnforcementMode[] = ['monitor', 'educate', 'guide', 'enforce'];
    expect(modes).toHaveLength(4);
    expect(modes).toContain('monitor');
    expect(modes).toContain('educate');
    expect(modes).toContain('guide');
    expect(modes).toContain('enforce');
  });

  it('can be used as a function parameter type', () => {
    const describe = (mode: EnforcementMode): string => `mode is ${mode}`;
    expect(describe('monitor')).toBe('mode is monitor');
    expect(describe('enforce')).toBe('mode is enforce');
  });
});

describe('Suggestion', () => {
  it('requires a message field', () => {
    const suggestion: Suggestion = { message: 'Use git push instead of force push' };
    expect(suggestion.message).toBe('Use git push instead of force push');
    expect(suggestion.correctedCommand).toBeUndefined();
  });

  it('accepts an optional correctedCommand', () => {
    const suggestion: Suggestion = {
      message: 'Force push is not allowed on protected branches',
      correctedCommand: 'git push origin main',
    };
    expect(suggestion.message).toBe('Force push is not allowed on protected branches');
    expect(suggestion.correctedCommand).toBe('git push origin main');
  });

  it('works in an array context (multiple suggestions)', () => {
    const suggestions: Suggestion[] = [
      { message: 'Avoid destructive operations' },
      { message: 'Use --no-force flag', correctedCommand: 'git push --no-force origin main' },
    ];
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].correctedCommand).toBeUndefined();
    expect(suggestions[1].correctedCommand).toBeDefined();
  });
});
