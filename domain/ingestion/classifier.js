// Classifier — maps parsed errors to canonical BugEvents
// Separates error classification from species mapping.
// Re-exports core logic from bug-event.js and adds the pipeline interface.

export {
  SEVERITY,
  createBugEvent,
  ERROR_TO_MONSTER_TYPE,
  resetFrequencies
} from '../../core/bug-event.js';

/**
 * Classify a parsed error into a canonical BugEvent.
 * This is the pipeline stage between parsing and species mapping.
 *
 * @param {{ type: string, message: string, rawLines: string[] }} parsedError
 * @param {{ file?: string, line?: number }} context - Optional source location
 * @returns {import('../../core/bug-event.js').BugEvent}
 */
export function classify(parsedError, context = {}) {
  const { createBugEvent: create } = { createBugEvent };
  return create(
    parsedError.type,
    parsedError.message,
    context.file || null,
    context.line || null
  );
}
