// Canonical domain events for BugMon
// All systems emit and consume these event types.
// No DOM, no Node.js APIs — pure data definitions.

// --- Event Kinds ---
// Ingestion pipeline
export const ERROR_OBSERVED = 'ErrorObserved';
export const BUG_CLASSIFIED = 'BugClassified';

// Battle lifecycle — values match existing battle-core.js event strings
export const ENCOUNTER_STARTED = 'ENCOUNTER_STARTED';
export const MOVE_USED = 'MOVE_USED';
export const DAMAGE_DEALT = 'DAMAGE_DEALT';
export const HEALING_APPLIED = 'HEALING_APPLIED';
export const PASSIVE_ACTIVATED = 'PASSIVE_ACTIVATED';
export const BUGMON_FAINTED = 'BUGMON_FAINTED';
export const CACHE_ATTEMPTED = 'CACHE_ATTEMPTED';
export const CACHE_SUCCESS = 'CACHE_SUCCESS';
export const BATTLE_ENDED = 'BATTLE_ENDED';

// Progression
export const ACTIVITY_RECORDED = 'ActivityRecorded';
export const EVOLUTION_TRIGGERED = 'EvolutionTriggered';

// Session
export const STATE_CHANGED = 'StateChanged';

/**
 * Create a canonical domain event.
 * @param {string} kind - One of the event kind constants
 * @param {object} data - Event-specific payload
 * @returns {{ kind: string, timestamp: number, data: object }}
 */
export function createEvent(kind, data = {}) {
  return { kind, timestamp: Date.now(), ...data };
}
