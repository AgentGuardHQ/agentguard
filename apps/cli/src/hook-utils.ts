/**
 * Shared utilities for Claude Code and Copilot CLI hook commands.
 * Centralises logic that must stay in sync across both hook implementations.
 */

/**
 * Returns true when default-deny should be active.
 * Fail-closed when policies are loaded; fail-open when none are configured.
 */
export function computeDefaultDeny(policyDefs: unknown[]): boolean {
  return policyDefs.length > 0;
}
