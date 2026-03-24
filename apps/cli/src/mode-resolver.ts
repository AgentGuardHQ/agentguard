// Mode resolution for enforcement modes per invariant.
// Pure function — no I/O, no side effects.

import type { EnforcementMode } from '@red-codes/core';

/** Invariant IDs that are always enforced regardless of config. */
const ALWAYS_ENFORCE = new Set(['no-secret-exposure']);

export interface ModeConfig {
  /** Top-level mode from agentguard.yaml. Defaults to 'enforce'. */
  mode?: EnforcementMode;
  /** Per-invariant overrides from agentguard.yaml invariants: section */
  invariantModes?: Record<string, EnforcementMode>;
  /** Per-invariant overrides from resolved policy pack */
  packModes?: Record<string, EnforcementMode>;
}

/**
 * Resolve the enforcement mode for a specific invariant (or policy rule).
 *
 * Resolution order:
 * 1. Hardcoded always-enforce list (no-secret-exposure)
 * 2. Per-invariant override from agentguard.yaml
 * 3. Pack defaults
 * 4. Top-level mode
 * 5. Default: 'enforce'
 *
 * Pass invariantId = null for policy-rule denials (uses top-level mode).
 */
export function resolveInvariantMode(
  invariantId: string | null,
  config: ModeConfig
): EnforcementMode {
  // Hardcoded enforce — cannot be overridden
  if (invariantId && ALWAYS_ENFORCE.has(invariantId)) {
    return 'enforce';
  }

  // Per-invariant override from yaml
  if (invariantId && config.invariantModes?.[invariantId]) {
    return config.invariantModes[invariantId];
  }

  // Pack defaults
  if (invariantId && config.packModes?.[invariantId]) {
    return config.packModes[invariantId];
  }

  // Top-level mode — default to enforce so policy denials are not silently ignored.
  // Users who want gradual rollout must explicitly set mode: monitor in agentguard.yaml.
  return config.mode ?? 'enforce';
}
