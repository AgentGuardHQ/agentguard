import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { scaffoldSquad } from '../src/scaffolder.js';
import { loadSquadManifest } from '../src/squad-manifest.js';
import { readFileSync, mkdtempSync, rmSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDefaultManifest() {
  const yaml = readFileSync(
    join(__dirname, '..', 'templates', 'config', 'squad-manifest.default.yaml'),
    'utf8',
  );
  return loadSquadManifest(yaml);
}

describe('scaffoldSquad', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'scaffold-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates squad state directory', () => {
    const manifest = loadDefaultManifest();
    scaffoldSquad(dir, 'kernel', manifest.squads.kernel);

    expect(existsSync(join(dir, '.agentguard', 'squads', 'kernel'))).toBe(true);
  });

  it('creates initial state.json with squad name', () => {
    const manifest = loadDefaultManifest();
    scaffoldSquad(dir, 'kernel', manifest.squads.kernel);

    const statePath = join(dir, '.agentguard', 'squads', 'kernel', 'state.json');
    expect(existsSync(statePath)).toBe(true);
    const state = JSON.parse(readFileSync(statePath, 'utf8'));
    expect(state.squad).toBe('kernel');
    expect(state.sprint).toEqual({ goal: '', issues: [] });
    expect(state.assignments).toEqual({});
    expect(state.blockers).toEqual([]);
    expect(state.prQueue).toEqual({ open: 0, reviewed: 0, mergeable: 0 });
    expect(typeof state.updatedAt).toBe('string');
  });

  it('creates learnings.json as empty array', () => {
    const manifest = loadDefaultManifest();
    scaffoldSquad(dir, 'kernel', manifest.squads.kernel);

    const learningsPath = join(dir, '.agentguard', 'squads', 'kernel', 'learnings.json');
    expect(existsSync(learningsPath)).toBe(true);
    const learnings = JSON.parse(readFileSync(learningsPath, 'utf8'));
    expect(learnings).toEqual([]);
  });

  it('does not overwrite existing state.json', () => {
    const manifest = loadDefaultManifest();
    const squadDir = join(dir, '.agentguard', 'squads', 'kernel');
    mkdirSync(squadDir, { recursive: true });

    const customState = JSON.stringify({ squad: 'kernel', custom: true });
    writeFileSync(join(squadDir, 'state.json'), customState, 'utf8');

    scaffoldSquad(dir, 'kernel', manifest.squads.kernel);

    const content = readFileSync(join(squadDir, 'state.json'), 'utf8');
    expect(JSON.parse(content).custom).toBe(true);
  });

  it('does not overwrite existing learnings.json', () => {
    const manifest = loadDefaultManifest();
    const squadDir = join(dir, '.agentguard', 'squads', 'kernel');
    mkdirSync(squadDir, { recursive: true });

    const customLearnings = JSON.stringify([{ lesson: 'test' }]);
    writeFileSync(join(squadDir, 'learnings.json'), customLearnings, 'utf8');

    scaffoldSquad(dir, 'kernel', manifest.squads.kernel);

    const content = readFileSync(join(squadDir, 'learnings.json'), 'utf8');
    expect(JSON.parse(content)).toEqual([{ lesson: 'test' }]);
  });

  it('scaffolds multiple squads independently', () => {
    const manifest = loadDefaultManifest();
    scaffoldSquad(dir, 'kernel', manifest.squads.kernel);
    scaffoldSquad(dir, 'cloud', manifest.squads.cloud);

    expect(existsSync(join(dir, '.agentguard', 'squads', 'kernel', 'state.json'))).toBe(true);
    expect(existsSync(join(dir, '.agentguard', 'squads', 'cloud', 'state.json'))).toBe(true);

    const kernelState = JSON.parse(
      readFileSync(join(dir, '.agentguard', 'squads', 'kernel', 'state.json'), 'utf8'),
    );
    const cloudState = JSON.parse(
      readFileSync(join(dir, '.agentguard', 'squads', 'cloud', 'state.json'), 'utf8'),
    );
    expect(kernelState.squad).toBe('kernel');
    expect(cloudState.squad).toBe('cloud');
  });
});
