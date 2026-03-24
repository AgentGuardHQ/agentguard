// Tests for the optional `suggest` callback on AgentGuardInvariant
import { describe, it, expect } from 'vitest';
import type { AgentGuardInvariant, SystemState } from '@red-codes/invariants';

describe('AgentGuardInvariant suggest callback', () => {
  it('invariant with suggest callback returns a suggestion', () => {
    const invariant: AgentGuardInvariant = {
      id: 'test-suggest',
      name: 'Test Suggest',
      description: 'Invariant with suggest callback for testing',
      severity: 3,
      check: () => ({ holds: false, expected: 'no force push', actual: 'force push detected' }),
      suggest: () => ({
        message: 'Use --force-with-lease instead of --force for safer push overrides.',
        correctedCommand: 'git push --force-with-lease origin main',
      }),
    };

    const state: SystemState = { forcePush: true, targetBranch: 'main' };
    const suggestion = invariant.suggest!(state);

    expect(suggestion).not.toBeNull();
    expect(suggestion!.message).toBe(
      'Use --force-with-lease instead of --force for safer push overrides.'
    );
    expect(suggestion!.correctedCommand).toBe('git push --force-with-lease origin main');
  });

  it('invariant without suggest callback — field is undefined', () => {
    const invariant: AgentGuardInvariant = {
      id: 'test-no-suggest',
      name: 'Test No Suggest',
      description: 'Invariant without suggest callback',
      severity: 3,
      check: () => ({ holds: true, expected: 'safe', actual: 'safe' }),
    };

    expect(invariant.suggest).toBeUndefined();
  });

  it('suggest callback receives SystemState and can use its fields', () => {
    const invariant: AgentGuardInvariant = {
      id: 'test-suggest-state',
      name: 'Test Suggest State',
      description: 'Invariant that uses SystemState fields in suggest',
      severity: 4,
      check: (state) => ({
        holds: !state.directPush,
        expected: 'no direct push to protected branch',
        actual: state.directPush ? 'direct push detected' : 'no direct push',
      }),
      suggest: (state) => {
        if (!state.targetBranch) return null;
        return {
          message: `Create a pull request instead of pushing directly to ${state.targetBranch}.`,
        };
      },
    };

    // With targetBranch present, suggest returns a message referencing it
    const stateWithBranch: SystemState = { directPush: true, targetBranch: 'main' };
    const suggestion = invariant.suggest!(stateWithBranch);
    expect(suggestion).not.toBeNull();
    expect(suggestion!.message).toBe(
      'Create a pull request instead of pushing directly to main.'
    );
    expect(suggestion!.correctedCommand).toBeUndefined();

    // Without targetBranch, suggest returns null
    const stateWithoutBranch: SystemState = { directPush: true };
    const nullSuggestion = invariant.suggest!(stateWithoutBranch);
    expect(nullSuggestion).toBeNull();
  });

  it('suggest callback can return null when no suggestion applies', () => {
    const invariant: AgentGuardInvariant = {
      id: 'test-suggest-null',
      name: 'Test Suggest Null',
      description: 'Invariant whose suggest returns null conditionally',
      severity: 2,
      check: () => ({ holds: true, expected: 'ok', actual: 'ok' }),
      suggest: () => null,
    };

    const state: SystemState = {};
    const suggestion = invariant.suggest!(state);
    expect(suggestion).toBeNull();
  });
});
