// Species mapper — maps classified errors to BugMon species
// This is the final stage of the ingestion pipeline.
// Re-exports the mapping logic from bug-event.js.

export { bugEventToMonster } from '../../core/bug-event.js';
export { matchMonster, getAllMonsters } from '../../core/matcher.js';
