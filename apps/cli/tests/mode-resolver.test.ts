import { describe, it, expect } from 'vitest';
import { resolveInvariantMode, type ModeConfig } from '../src/mode-resolver.js';

describe('resolveInvariantMode', () => {
  it('returns top-level mode when no overrides', () => {
    const config: ModeConfig = { mode: 'monitor' };
    expect(resolveInvariantMode('no-force-push', config)).toBe('monitor');
  });

  it('defaults to enforce when mode is absent', () => {
    const config: ModeConfig = {};
    expect(resolveInvariantMode('no-force-push', config)).toBe('enforce');
  });

  it('returns enforce when top-level mode is enforce', () => {
    const config: ModeConfig = { mode: 'enforce' };
    expect(resolveInvariantMode('no-force-push', config)).toBe('enforce');
  });

  it('per-invariant override takes precedence over top-level mode', () => {
    const config: ModeConfig = {
      mode: 'monitor',
      invariantModes: { 'no-force-push': 'enforce' },
    };
    expect(resolveInvariantMode('no-force-push', config)).toBe('enforce');
  });

  it('hardcodes no-secret-exposure to enforce regardless of config', () => {
    const config: ModeConfig = {
      mode: 'monitor',
      invariantModes: { 'no-secret-exposure': 'monitor' },
    };
    expect(resolveInvariantMode('no-secret-exposure', config)).toBe('enforce');
  });

  it('pack overrides take precedence over top-level mode', () => {
    const config: ModeConfig = {
      mode: 'monitor',
      packModes: { 'protected-branch': 'enforce' },
    };
    expect(resolveInvariantMode('protected-branch', config)).toBe('enforce');
  });

  it('per-invariant override takes precedence over pack', () => {
    const config: ModeConfig = {
      mode: 'monitor',
      packModes: { 'protected-branch': 'enforce' },
      invariantModes: { 'protected-branch': 'monitor' },
    };
    expect(resolveInvariantMode('protected-branch', config)).toBe('monitor');
  });

  it('resolves policy rule mode from top-level mode when invariantId is null', () => {
    const config: ModeConfig = { mode: 'monitor' };
    expect(resolveInvariantMode(null, config)).toBe('monitor');
  });

  it('resolves policy rule mode as enforce when top-level is enforce', () => {
    const config: ModeConfig = { mode: 'enforce' };
    expect(resolveInvariantMode(null, config)).toBe('enforce');
  });

  it('unmentioned invariant inherits top-level mode', () => {
    const config: ModeConfig = {
      mode: 'enforce',
      invariantModes: { 'no-force-push': 'monitor' },
    };
    expect(resolveInvariantMode('blast-radius-limit', config)).toBe('enforce');
  });

  // --- Four-mode tests (educate + guide) ---

  it('guide mode works as top-level', () => {
    const config: ModeConfig = { mode: 'guide' };
    expect(resolveInvariantMode('no-force-push', config)).toBe('guide');
  });

  it('educate mode works as top-level', () => {
    const config: ModeConfig = { mode: 'educate' };
    expect(resolveInvariantMode('no-force-push', config)).toBe('educate');
  });

  it('per-invariant guide overrides top-level enforce', () => {
    const config: ModeConfig = {
      mode: 'enforce',
      invariantModes: { 'no-force-push': 'guide' },
    };
    expect(resolveInvariantMode('no-force-push', config)).toBe('guide');
  });

  it('per-invariant educate overrides top-level monitor', () => {
    const config: ModeConfig = {
      mode: 'monitor',
      invariantModes: { 'no-force-push': 'educate' },
    };
    expect(resolveInvariantMode('no-force-push', config)).toBe('educate');
  });

  it('hardcoded no-secret-exposure stays enforce even with guide mode', () => {
    const config: ModeConfig = {
      mode: 'guide',
      invariantModes: { 'no-secret-exposure': 'guide' },
    };
    expect(resolveInvariantMode('no-secret-exposure', config)).toBe('enforce');
  });

  it('policy rule denial (null invariantId) uses guide mode', () => {
    const config: ModeConfig = { mode: 'guide' };
    expect(resolveInvariantMode(null, config)).toBe('guide');
  });
});
