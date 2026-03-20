// Tests for RunManifest YAML loader
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  parseManifestYaml,
  loadManifestFile,
  ManifestValidationError,
} from '../src/manifest-loader.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ---------------------------------------------------------------------------
// parseManifestYaml — valid manifests
// ---------------------------------------------------------------------------

describe('parseManifestYaml', () => {
  const minimalYaml = `
sessionId: test-session
role: builder
grants:
  - permissions:
      - read
      - write
    actions:
      - "file.*"
scope:
  allowedPaths:
    - "src/**"
`;

  it('parses a minimal valid manifest', () => {
    const manifest = parseManifestYaml(minimalYaml);
    expect(manifest.sessionId).toBe('test-session');
    expect(manifest.role).toBe('builder');
    expect(manifest.grants).toHaveLength(1);
    expect(manifest.grants[0].permissions).toEqual(['read', 'write']);
    expect(manifest.grants[0].actions).toEqual(['file.*']);
    expect(manifest.scope.allowedPaths).toEqual(['src/**']);
  });

  it('parses all optional fields', () => {
    const yaml = `
sessionId: full-session
role: architect
description: A fully-configured session
maxDurationMs: 3600000
grants:
  - permissions:
      - read
      - write
      - execute
      - deploy
    actions:
      - "file.*"
      - "git.*"
    filePatterns:
      - "src/**"
    branchPatterns:
      - "feature/*"
    commandAllowlist:
      - "npm test"
scope:
  allowedPaths:
    - "src/**"
  deniedPaths:
    - ".env*"
  allowedBranches:
    - "feature/*"
  deniedBranches:
    - main
  allowedCommands:
    - "npm test"
  maxBlastRadius: 10
metadata:
  template: full
  version: "1.0"
`;
    const manifest = parseManifestYaml(yaml);
    expect(manifest.description).toBe('A fully-configured session');
    expect(manifest.maxDurationMs).toBe(3600000);
    expect(manifest.grants[0].permissions).toEqual(['read', 'write', 'execute', 'deploy']);
    expect(manifest.grants[0].filePatterns).toEqual(['src/**']);
    expect(manifest.grants[0].branchPatterns).toEqual(['feature/*']);
    expect(manifest.grants[0].commandAllowlist).toEqual(['npm test']);
    expect(manifest.scope.deniedPaths).toEqual(['.env*']);
    expect(manifest.scope.allowedBranches).toEqual(['feature/*']);
    expect(manifest.scope.deniedBranches).toEqual(['main']);
    expect(manifest.scope.allowedCommands).toEqual(['npm test']);
    expect(manifest.scope.maxBlastRadius).toBe(10);
    expect(manifest.metadata).toEqual({ template: 'full', version: '1.0' });
  });

  it('parses multiple grants', () => {
    const yaml = `
sessionId: multi-grant
role: tester
grants:
  - permissions:
      - read
    actions:
      - file.read
  - permissions:
      - execute
    actions:
      - test.run
      - test.run.unit
scope:
  allowedPaths:
    - "**/*"
`;
    const manifest = parseManifestYaml(yaml);
    expect(manifest.grants).toHaveLength(2);
    expect(manifest.grants[0].actions).toEqual(['file.read']);
    expect(manifest.grants[1].actions).toEqual(['test.run', 'test.run.unit']);
  });

  it('accepts all valid agent roles', () => {
    const roles = ['architect', 'builder', 'tester', 'optimizer', 'auditor'];
    for (const role of roles) {
      const yaml = `
sessionId: role-test
role: ${role}
grants:
  - permissions:
      - read
    actions:
      - file.read
scope:
  allowedPaths:
    - "src/**"
`;
      const manifest = parseManifestYaml(yaml);
      expect(manifest.role).toBe(role);
    }
  });

  it('omits undefined optional fields from the result', () => {
    const manifest = parseManifestYaml(minimalYaml);
    expect(manifest).not.toHaveProperty('description');
    expect(manifest).not.toHaveProperty('maxDurationMs');
    expect(manifest).not.toHaveProperty('metadata');
    expect(manifest.grants[0]).not.toHaveProperty('filePatterns');
    expect(manifest.grants[0]).not.toHaveProperty('branchPatterns');
    expect(manifest.grants[0]).not.toHaveProperty('commandAllowlist');
    expect(manifest.scope).not.toHaveProperty('deniedPaths');
    expect(manifest.scope).not.toHaveProperty('allowedBranches');
    expect(manifest.scope).not.toHaveProperty('deniedBranches');
    expect(manifest.scope).not.toHaveProperty('allowedCommands');
    expect(manifest.scope).not.toHaveProperty('maxBlastRadius');
  });
});

// ---------------------------------------------------------------------------
// parseManifestYaml — validation errors
// ---------------------------------------------------------------------------

describe('parseManifestYaml validation', () => {
  it('rejects non-object YAML', () => {
    expect(() => parseManifestYaml('just a string')).toThrow(ManifestValidationError);
  });

  it('rejects missing sessionId', () => {
    const yaml = `
role: builder
grants:
  - permissions: [read]
    actions: [file.read]
scope:
  allowedPaths: ["src/**"]
`;
    expect(() => parseManifestYaml(yaml)).toThrow(ManifestValidationError);
    try {
      parseManifestYaml(yaml);
    } catch (err) {
      expect((err as ManifestValidationError).errors).toContainEqual(
        expect.stringContaining('sessionId')
      );
    }
  });

  it('rejects invalid role', () => {
    const yaml = `
sessionId: test
role: hacker
grants:
  - permissions: [read]
    actions: [file.read]
scope:
  allowedPaths: ["src/**"]
`;
    expect(() => parseManifestYaml(yaml)).toThrow(ManifestValidationError);
    try {
      parseManifestYaml(yaml);
    } catch (err) {
      expect((err as ManifestValidationError).errors).toContainEqual(
        expect.stringContaining('role')
      );
    }
  });

  it('rejects missing grants', () => {
    const yaml = `
sessionId: test
role: builder
scope:
  allowedPaths: ["src/**"]
`;
    expect(() => parseManifestYaml(yaml)).toThrow(ManifestValidationError);
  });

  it('rejects grants with invalid permissions', () => {
    const yaml = `
sessionId: test
role: builder
grants:
  - permissions: [admin]
    actions: [file.read]
scope:
  allowedPaths: ["src/**"]
`;
    expect(() => parseManifestYaml(yaml)).toThrow(ManifestValidationError);
    try {
      parseManifestYaml(yaml);
    } catch (err) {
      expect((err as ManifestValidationError).errors).toContainEqual(
        expect.stringContaining('admin')
      );
    }
  });

  it('rejects grants with empty actions', () => {
    const yaml = `
sessionId: test
role: builder
grants:
  - permissions: [read]
    actions: []
scope:
  allowedPaths: ["src/**"]
`;
    expect(() => parseManifestYaml(yaml)).toThrow(ManifestValidationError);
  });

  it('rejects missing scope', () => {
    const yaml = `
sessionId: test
role: builder
grants:
  - permissions: [read]
    actions: [file.read]
`;
    expect(() => parseManifestYaml(yaml)).toThrow(ManifestValidationError);
  });

  it('rejects scope without allowedPaths', () => {
    const yaml = `
sessionId: test
role: builder
grants:
  - permissions: [read]
    actions: [file.read]
scope:
  deniedPaths: [".env"]
`;
    expect(() => parseManifestYaml(yaml)).toThrow(ManifestValidationError);
  });

  it('rejects negative maxDurationMs', () => {
    const yaml = `
sessionId: test
role: builder
maxDurationMs: -100
grants:
  - permissions: [read]
    actions: [file.read]
scope:
  allowedPaths: ["src/**"]
`;
    expect(() => parseManifestYaml(yaml)).toThrow(ManifestValidationError);
  });

  it('collects multiple errors in a single throw', () => {
    const yaml = `
role: invalid
grants: not-an-array
scope: not-an-object
`;
    try {
      parseManifestYaml(yaml);
      expect.fail('Should have thrown');
    } catch (err) {
      const validationErr = err as ManifestValidationError;
      expect(validationErr.errors.length).toBeGreaterThanOrEqual(3);
    }
  });
});

// ---------------------------------------------------------------------------
// loadManifestFile
// ---------------------------------------------------------------------------

describe('loadManifestFile', () => {
  const tmpDir = join(tmpdir(), 'agentguard-manifest-test-' + Date.now());

  // Setup and teardown
  beforeAll(() => {
    mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads and parses a YAML file from disk', () => {
    const filePath = join(tmpDir, 'test-manifest.yaml');
    writeFileSync(
      filePath,
      `
sessionId: file-test
role: tester
grants:
  - permissions: [read, execute]
    actions: [test.run]
scope:
  allowedPaths: ["tests/**"]
`
    );

    const manifest = loadManifestFile(filePath);
    expect(manifest.sessionId).toBe('file-test');
    expect(manifest.role).toBe('tester');
  });

  it('throws with file path in error message for invalid files', () => {
    const filePath = join(tmpDir, 'invalid-manifest.yaml');
    writeFileSync(filePath, 'role: invalid');

    expect(() => loadManifestFile(filePath)).toThrow('invalid-manifest.yaml');
  });

  it('throws for non-existent files', () => {
    expect(() => loadManifestFile(join(tmpDir, 'nonexistent.yaml'))).toThrow();
  });
});
