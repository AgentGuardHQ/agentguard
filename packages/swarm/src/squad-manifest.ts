import { parse } from 'yaml';
import type { SquadManifest, Squad, SquadAgent, LoopGuardConfig } from './types.js';

export function loadSquadManifest(yamlContent: string): SquadManifest {
  const raw = parse(yamlContent) as Record<string, unknown>;

  const org = raw.org as Record<string, unknown>;
  const director = parseAgent(org.director as Record<string, unknown>);

  const rawSquads = raw.squads as Record<string, Record<string, unknown>>;
  const squads: Record<string, Squad> = {};

  for (const [name, rawSquad] of Object.entries(rawSquads)) {
    const em = parseAgent(rawSquad.em as Record<string, unknown>);
    const rawAgents = rawSquad.agents as Record<string, Record<string, unknown>>;
    const agents: Record<string, SquadAgent> = {};
    for (const [role, rawAgent] of Object.entries(rawAgents)) {
      agents[role] = parseAgent(rawAgent);
    }
    squads[name] = {
      name,
      repo: rawSquad.repo as string,
      em,
      agents,
    };
  }

  const rawGuards = raw.loopGuards as Record<string, number>;
  const loopGuards: LoopGuardConfig = {
    maxOpenPRsPerSquad: rawGuards.maxOpenPRsPerSquad ?? 3,
    maxRetries: rawGuards.maxRetries ?? 3,
    maxBlastRadius: rawGuards.maxBlastRadius ?? 20,
    maxRunMinutes: rawGuards.maxRunMinutes ?? 10,
  };

  return {
    version: raw.version as string,
    org: { director },
    squads,
    loopGuards,
  };
}

function parseAgent(raw: Record<string, unknown>): SquadAgent {
  return {
    id: raw.id as string,
    rank: raw.rank as SquadAgent['rank'],
    driver: raw.driver as SquadAgent['driver'],
    model: raw.model as SquadAgent['model'],
    cron: raw.cron as string,
    skills: (raw.skills as string[]) ?? [],
  };
}

/** Build the 4-part identity string: driver:model:squad:rank */
export function buildAgentIdentity(agent: SquadAgent, squadName: string): string {
  return `${agent.driver}:${agent.model}:${squadName}:${agent.rank}`;
}

/** Parse a 4-part identity string back into components */
export function parseAgentIdentity(identity: string): {
  driver: string;
  model: string;
  squad: string;
  rank: string;
} | null {
  const parts = identity.split(':');
  if (parts.length < 4) return null;
  return {
    driver: parts[0],
    model: parts[1],
    squad: parts[2],
    rank: parts[3],
  };
}
