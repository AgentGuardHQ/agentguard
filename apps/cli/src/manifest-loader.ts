// Manifest loader — parses and validates RunManifest YAML files.
// Provides declarative session configuration for the governed action runtime.

import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import type {
  RunManifest,
  AgentRole,
  PermissionLevel,
  CapabilityGrant,
  ScopeRestriction,
} from '@red-codes/core';

const VALID_ROLES: readonly AgentRole[] = [
  'architect',
  'builder',
  'tester',
  'optimizer',
  'auditor',
];
const VALID_PERMISSIONS: readonly PermissionLevel[] = ['read', 'write', 'execute', 'deploy'];

/** Errors encountered during manifest validation */
export class ManifestValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: readonly string[]
  ) {
    super(message);
    this.name = 'ManifestValidationError';
  }
}

/** Parse a YAML string into a validated RunManifest */
export function parseManifestYaml(content: string): RunManifest {
  const raw = parseYaml(content) as Record<string, unknown>;
  if (!raw || typeof raw !== 'object') {
    throw new ManifestValidationError('Manifest must be a YAML object', [
      'Parsed content is not an object',
    ]);
  }
  return validateManifest(raw);
}

/** Load a manifest YAML file from disk and return a validated RunManifest */
export function loadManifestFile(filePath: string): RunManifest {
  const content = readFileSync(filePath, 'utf8');
  try {
    return parseManifestYaml(content);
  } catch (err) {
    if (err instanceof ManifestValidationError) {
      throw new ManifestValidationError(
        `Invalid manifest file '${filePath}': ${err.message}`,
        err.errors
      );
    }
    throw new Error(`Failed to parse manifest file '${filePath}': ${(err as Error).message}`);
  }
}

function validateManifest(raw: Record<string, unknown>): RunManifest {
  const errors: string[] = [];

  // Required: sessionId
  if (typeof raw.sessionId !== 'string' || raw.sessionId.length === 0) {
    errors.push("'sessionId' is required and must be a non-empty string");
  }

  // Required: role
  if (typeof raw.role !== 'string' || !(VALID_ROLES as readonly string[]).includes(raw.role)) {
    errors.push(`'role' must be one of: ${VALID_ROLES.join(', ')} (got '${String(raw.role)}')`);
  }

  // Required: grants (array)
  if (!Array.isArray(raw.grants)) {
    errors.push("'grants' is required and must be an array");
  } else {
    for (let i = 0; i < raw.grants.length; i++) {
      const grantErrors = validateGrant(raw.grants[i] as Record<string, unknown>, i);
      errors.push(...grantErrors);
    }
  }

  // Required: scope (object)
  if (!raw.scope || typeof raw.scope !== 'object' || Array.isArray(raw.scope)) {
    errors.push("'scope' is required and must be an object");
  } else {
    const scopeErrors = validateScope(raw.scope as Record<string, unknown>);
    errors.push(...scopeErrors);
  }

  // Optional: description
  if (raw.description !== undefined && typeof raw.description !== 'string') {
    errors.push("'description' must be a string if provided");
  }

  // Optional: maxDurationMs
  if (raw.maxDurationMs !== undefined) {
    if (typeof raw.maxDurationMs !== 'number' || raw.maxDurationMs <= 0) {
      errors.push("'maxDurationMs' must be a positive number if provided");
    }
  }

  // Optional: metadata
  if (raw.metadata !== undefined) {
    if (typeof raw.metadata !== 'object' || Array.isArray(raw.metadata) || raw.metadata === null) {
      errors.push("'metadata' must be an object if provided");
    }
  }

  if (errors.length > 0) {
    throw new ManifestValidationError(
      `Manifest validation failed with ${errors.length} error(s)`,
      errors
    );
  }

  return {
    sessionId: raw.sessionId as string,
    role: raw.role as AgentRole,
    grants: (raw.grants as Record<string, unknown>[]).map(toCapabilityGrant),
    scope: toScopeRestriction(raw.scope as Record<string, unknown>),
    ...(raw.description !== undefined && { description: raw.description as string }),
    ...(raw.maxDurationMs !== undefined && { maxDurationMs: raw.maxDurationMs as number }),
    ...(raw.metadata !== undefined && { metadata: raw.metadata as Record<string, unknown> }),
  };
}

function validateGrant(raw: Record<string, unknown>, index: number): string[] {
  const errors: string[] = [];
  const prefix = `grants[${index}]`;

  if (!raw || typeof raw !== 'object') {
    return [`${prefix} must be an object`];
  }

  // Required: permissions
  if (!Array.isArray(raw.permissions) || raw.permissions.length === 0) {
    errors.push(`${prefix}.permissions is required and must be a non-empty array`);
  } else {
    for (const perm of raw.permissions) {
      if (!(VALID_PERMISSIONS as readonly string[]).includes(perm as string)) {
        errors.push(
          `${prefix}.permissions contains invalid value '${String(perm)}' (expected: ${VALID_PERMISSIONS.join(', ')})`
        );
      }
    }
  }

  // Required: actions
  if (!Array.isArray(raw.actions) || raw.actions.length === 0) {
    errors.push(`${prefix}.actions is required and must be a non-empty array`);
  } else {
    for (const action of raw.actions) {
      if (typeof action !== 'string') {
        errors.push(`${prefix}.actions contains non-string value`);
      }
    }
  }

  // Optional arrays: filePatterns, branchPatterns, commandAllowlist
  for (const field of ['filePatterns', 'branchPatterns', 'commandAllowlist'] as const) {
    const val = raw[field];
    if (val !== undefined) {
      if (!Array.isArray(val)) {
        errors.push(`${prefix}.${field} must be an array if provided`);
      } else {
        for (const item of val) {
          if (typeof item !== 'string') {
            errors.push(`${prefix}.${field} contains non-string value`);
          }
        }
      }
    }
  }

  return errors;
}

function validateScope(raw: Record<string, unknown>): string[] {
  const errors: string[] = [];

  // Required: allowedPaths
  if (!Array.isArray(raw.allowedPaths)) {
    errors.push('scope.allowedPaths is required and must be an array');
  } else {
    for (const item of raw.allowedPaths) {
      if (typeof item !== 'string') {
        errors.push('scope.allowedPaths contains non-string value');
      }
    }
  }

  // Optional arrays
  for (const field of [
    'deniedPaths',
    'allowedBranches',
    'deniedBranches',
    'allowedCommands',
  ] as const) {
    const val = raw[field];
    if (val !== undefined) {
      if (!Array.isArray(val)) {
        errors.push(`scope.${field} must be an array if provided`);
      } else {
        for (const item of val) {
          if (typeof item !== 'string') {
            errors.push(`scope.${field} contains non-string value`);
          }
        }
      }
    }
  }

  // Optional: maxBlastRadius
  if (raw.maxBlastRadius !== undefined) {
    if (typeof raw.maxBlastRadius !== 'number' || raw.maxBlastRadius < 0) {
      errors.push('scope.maxBlastRadius must be a non-negative number if provided');
    }
  }

  return errors;
}

function toCapabilityGrant(raw: Record<string, unknown>): CapabilityGrant {
  return {
    permissions: raw.permissions as PermissionLevel[],
    actions: raw.actions as string[],
    ...(raw.filePatterns !== undefined && { filePatterns: raw.filePatterns as string[] }),
    ...(raw.branchPatterns !== undefined && { branchPatterns: raw.branchPatterns as string[] }),
    ...(raw.commandAllowlist !== undefined && {
      commandAllowlist: raw.commandAllowlist as string[],
    }),
  };
}

function toScopeRestriction(raw: Record<string, unknown>): ScopeRestriction {
  return {
    allowedPaths: raw.allowedPaths as string[],
    ...(raw.deniedPaths !== undefined && { deniedPaths: raw.deniedPaths as string[] }),
    ...(raw.allowedBranches !== undefined && { allowedBranches: raw.allowedBranches as string[] }),
    ...(raw.deniedBranches !== undefined && { deniedBranches: raw.deniedBranches as string[] }),
    ...(raw.allowedCommands !== undefined && { allowedCommands: raw.allowedCommands as string[] }),
    ...(raw.maxBlastRadius !== undefined && { maxBlastRadius: raw.maxBlastRadius as number }),
  };
}
