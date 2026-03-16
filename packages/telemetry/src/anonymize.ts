import { createHash } from 'node:crypto';
import type { AgentEvent } from './event-mapper.js';

/**
 * Strip a resource path to its basename only, handling both Unix and Windows
 * path separators. Returns undefined if the input is undefined.
 */
function stripResource(resource: string | undefined): string | undefined {
  if (resource === undefined) return undefined;
  // Handle both forward and back slashes by splitting on either
  const segments = resource.split(/[/\\]/);
  return segments[segments.length - 1];
}

/**
 * Produce a consistent, non-reversible hash of the agentId scoped to
 * a particular installation. Same (installId, agentId) always yields the
 * same hash, but different installs produce different hashes.
 */
function hashAgentId(installId: string, agentId: string): string {
  return createHash('sha256')
    .update(installId + agentId)
    .digest('hex');
}

/**
 * Return a privacy-safe copy of an AgentEvent:
 * - `resource` is stripped to its basename (no directory info leaked)
 * - `agentId` is SHA-256 hashed with the install id (consistent but not reversible)
 * - `metadata` is removed entirely
 * - All other fields are preserved as-is
 */
export function anonymizeEvent(event: AgentEvent, installId: string): AgentEvent {
  return {
    ...event,
    resource: stripResource(event.resource),
    agentId: hashAgentId(installId, event.agentId),
    metadata: undefined,
  };
}
