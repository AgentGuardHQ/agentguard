import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { SquadState, EMReport, DirectorBrief } from './types.js';

function squadDir(root: string, squad: string): string {
  return join(root, '.agentguard', 'squads', squad);
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function readSquadState(root: string, squad: string): SquadState | null {
  const path = join(squadDir(root, squad), 'state.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as SquadState;
  } catch {
    return null;
  }
}

export function writeSquadState(root: string, squad: string, state: SquadState): void {
  const dir = squadDir(root, squad);
  ensureDir(dir);
  writeFileSync(join(dir, 'state.json'), JSON.stringify(state, null, 2), 'utf8');
}

export function readEMReport(root: string, squad: string): EMReport | null {
  const path = join(squadDir(root, squad), 'em-report.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as EMReport;
  } catch {
    return null;
  }
}

export function writeEMReport(root: string, squad: string, report: EMReport): void {
  const dir = squadDir(root, squad);
  ensureDir(dir);
  writeFileSync(join(dir, 'em-report.json'), JSON.stringify(report, null, 2), 'utf8');
}

export function readDirectorBrief(root: string): DirectorBrief | null {
  const path = join(root, '.agentguard', 'director-brief.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as DirectorBrief;
  } catch {
    return null;
  }
}

export function writeDirectorBrief(root: string, brief: DirectorBrief): void {
  const dir = join(root, '.agentguard');
  ensureDir(dir);
  writeFileSync(join(dir, 'director-brief.json'), JSON.stringify(brief, null, 2), 'utf8');
}
