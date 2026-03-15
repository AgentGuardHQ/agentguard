// Privacy-safe action classification — classifies targets and commands
// without leaking raw paths or arguments. Uses governance data patterns
// from @red-codes/core for consistent classification.

import { createHash } from 'node:crypto';
import type { GovernanceDecisionRecord } from '@red-codes/core';
import {
  INVARIANT_CREDENTIAL_PATH_PATTERNS,
  INVARIANT_CREDENTIAL_BASENAME_PATTERNS,
  INVARIANT_SENSITIVE_FILE_PATTERNS,
  getDestructivePatterns,
} from '@red-codes/core';

export type TargetType =
  | 'source'
  | 'config'
  | 'credential'
  | 'test'
  | 'build'
  | 'binary'
  | 'unknown';

export interface SanitizedAction {
  target_type: TargetType;
  target_hash: string;
  args_classification: string;
}

const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.rb',
  '.go',
  '.rs',
  '.java',
  '.c',
  '.cpp',
  '.h',
  '.cs',
  '.swift',
  '.kt',
  '.scala',
  '.php',
  '.lua',
  '.sh',
  '.bash',
  '.zsh',
]);

const CONFIG_EXTENSIONS = new Set([
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.ini',
  '.cfg',
  '.conf',
  '.xml',
  '.env',
]);

const CONFIG_BASENAMES = new Set([
  'package.json',
  'tsconfig.json',
  'eslint.config.js',
  '.eslintrc',
  '.prettierrc',
  'turbo.json',
  'vitest.config.ts',
  'vite.config.ts',
  'webpack.config.js',
  'Dockerfile',
  'docker-compose.yml',
  'Makefile',
  'Cargo.toml',
  'go.mod',
  'pyproject.toml',
  'Gemfile',
]);

const TEST_PATTERNS = [/\.test\./, /\.spec\./, /__tests__/, /\/tests?\//];

const BUILD_PATTERNS = [/(?:^|\/)dist\//, /(?:^|\/)build\//, /(?:^|\/)out\//, /(?:^|\/)target\//, /\.min\./];

const BINARY_EXTENSIONS = new Set([
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.bin',
  '.wasm',
  '.o',
  '.a',
]);

let credentialStrings: string[] | null = null;
let sensitiveStrings: string[] | null = null;

function getCredentialStrings(): string[] {
  if (!credentialStrings) {
    credentialStrings = [
      ...INVARIANT_CREDENTIAL_PATH_PATTERNS.map((p) => p.toLowerCase()),
      ...INVARIANT_CREDENTIAL_BASENAME_PATTERNS.map((p) => p.toLowerCase()),
    ];
  }
  return credentialStrings;
}

function getSensitiveStrings(): string[] {
  if (!sensitiveStrings) {
    sensitiveStrings = INVARIANT_SENSITIVE_FILE_PATTERNS.map((p) => p.toLowerCase());
  }
  return sensitiveStrings;
}

function matchesPatterns(value: string, patterns: string[]): boolean {
  const lower = value.toLowerCase();
  return patterns.some((p) => lower.includes(p));
}

/** Hash a string to a truncated SHA-256, prefixed with "sha256:" */
export function hashTarget(target: string): string {
  if (!target) return 'sha256:0000000000000000';
  const hash = createHash('sha256').update(target).digest('hex').slice(0, 16);
  return `sha256:${hash}`;
}

/** Classify a file path into a target type */
export function classifyTarget(target: string): TargetType {
  if (!target) return 'unknown';

  const lower = target.toLowerCase();
  const basename = lower.split('/').pop() ?? '';
  const ext = basename.includes('.') ? '.' + basename.split('.').pop() : '';

  // Credential check first (highest priority)
  if (matchesPatterns(target, getCredentialStrings())) return 'credential';

  // Sensitive file check
  if (matchesPatterns(target, getSensitiveStrings())) return 'credential';

  // Build output (check before source — dist/index.js is build, not source)
  for (const pattern of BUILD_PATTERNS) {
    if (pattern.test(lower)) return 'build';
  }

  // Test files
  for (const pattern of TEST_PATTERNS) {
    if (pattern.test(lower)) return 'test';
  }

  // Binary files
  if (BINARY_EXTENSIONS.has(ext)) return 'binary';

  // Config files (by basename or extension)
  if (CONFIG_BASENAMES.has(basename)) return 'config';
  if (CONFIG_EXTENSIONS.has(ext)) return 'config';

  // Source files
  if (SOURCE_EXTENSIONS.has(ext)) return 'source';

  return 'unknown';
}

/** Classify a command's intent without exposing raw arguments */
export function classifyCommand(command: string | undefined, target: string): string {
  if (!command) {
    // No command — classify based on target alone
    if (matchesPatterns(target, getCredentialStrings())) return 'sensitive_file_access';
    if (matchesPatterns(target, getSensitiveStrings())) return 'sensitive_file_access';
    return 'benign';
  }

  // Check against destructive patterns from governance data
  const destructive = getDestructivePatterns();
  for (const dp of destructive) {
    if (dp.pattern.test(command)) {
      return `${dp.category}:${dp.description}`;
    }
  }

  // Check for sensitive file access in the command
  if (matchesPatterns(command, getCredentialStrings())) return 'sensitive_file_access';
  if (matchesPatterns(command, getSensitiveStrings())) return 'sensitive_file_access';

  return 'benign';
}

/** Sanitize a GovernanceDecisionRecord into privacy-safe fields */
export function sanitizeAction(record: GovernanceDecisionRecord): SanitizedAction {
  const target = record.action.target ?? '';
  const command = record.action.command;

  return {
    target_type: classifyTarget(target),
    target_hash: hashTarget(target),
    args_classification: classifyCommand(command, target),
  };
}
