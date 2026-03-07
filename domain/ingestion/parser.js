// Error parser — re-exports from core/error-parser.js
// This module provides the parsing stage of the ingestion pipeline.
// Parser extracts structured error objects from raw stderr/stdout text.
//
// The actual implementation lives in core/error-parser.js (unchanged).
// This re-export makes the ingestion pipeline importable from domain/.

export { parseErrors } from '../../core/error-parser.js';
export { parseStackTrace, getUserFrame } from '../../core/stacktrace-parser.js';
