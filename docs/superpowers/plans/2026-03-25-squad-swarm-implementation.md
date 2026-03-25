# Squad Swarm Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the flat 26-agent swarm into 3 product squads (Kernel, Cloud, QA) with EM→Director→Human reporting, Copilot CLI as workhorse, 5-layer loop guards, and squad identity flowing through telemetry to the dashboard.

**Architecture:** Extend `@red-codes/swarm` types with squad hierarchy (`SquadManifest`, `Squad`, `SquadAgent`). Each squad writes its own state file. Loop guards are checked by every agent at run start. Identity format `driver:model:squad:rank` is parsed from existing `agent_id` fields — no schema migration needed.

**Tech Stack:** TypeScript (swarm package), YAML (squad manifest), JSON (squad state), existing `@red-codes/swarm` + `@red-codes/core` packages

**Spec:** `docs/superpowers/specs/2026-03-25-squad-swarm-structure-design.md`

---

### Task 1: Extend swarm types with squad hierarchy

**Files:**
- Modify: `packages/swarm/src/types.ts`
- Create: `packages/swarm/tests/types.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/swarm/tests/types.test.ts
import { describe, it, expect } from 'vitest';
import type {
  SquadManifest,
  Squad,
  SquadAgent,
  SquadRank,
  SquadState,
  LoopGuardConfig,
} from '../src/types.js';

describe('Squad types', () => {
  it('SquadAgent has driver, model, squad, rank fields', () => {
    const agent: SquadAgent = {
      id: 'kernel-senior',
      rank: 'senior',
      driver: 'copilot-cli',
      model: 'sonnet',
      cron: '0 */2 * * *',
      skills: ['claim-issue', 'implement-issue', 'create-pr'],
    };
    expect(agent.driver).toBe('copilot-cli');
    expect(agent.rank).toBe('senior');
  });

  it('Squad contains em + 5 agents', () => {
    const squad: Squad = {
      name: 'kernel',
      repo: 'agent-guard',
      em: {
        id: 'kernel-em',
        rank: 'em',
        driver: 'claude-code',
        model: 'opus',
        cron: '0 */3 * * *',
        skills: ['squad-plan', 'squad-execute'],
      },
      agents: {
        'product-lead': { id: 'kernel-pl', rank: 'product-lead', driver: 'claude-code', model: 'sonnet', cron: '0 6 * * *', skills: [] },
        architect: { id: 'kernel-arch', rank: 'architect', driver: 'claude-code', model: 'opus', cron: '0 */4 * * *', skills: [] },
        senior: { id: 'kernel-sr', rank: 'senior', driver: 'copilot-cli', model: 'sonnet', cron: '0 */2 * * *', skills: [] },
        junior: { id: 'kernel-jr', rank: 'junior', driver: 'copilot-cli', model: 'copilot', cron: '0 */2 * * *', skills: [] },
        qa: { id: 'kernel-qa', rank: 'qa', driver: 'copilot-cli', model: 'sonnet', cron: '0 */3 * * *', skills: [] },
      },
    };
    expect(Object.keys(squad.agents)).toHaveLength(5);
    expect(squad.em.rank).toBe('em');
  });

  it('SquadManifest has director + squads', () => {
    const manifest: SquadManifest = {
      version: '1.0.0',
      org: {
        director: { id: 'director', rank: 'director', driver: 'claude-code', model: 'opus', cron: '0 7,19 * * *', skills: [] },
      },
      squads: {},
      loopGuards: {
        maxOpenPRsPerSquad: 3,
        maxRetries: 3,
        maxBlastRadius: 20,
        maxRunMinutes: 10,
      },
    };
    expect(manifest.org.director.rank).toBe('director');
  });

  it('SquadRank includes all valid ranks', () => {
    const ranks: SquadRank[] = ['director', 'em', 'product-lead', 'architect', 'senior', 'junior', 'qa'];
    expect(ranks).toHaveLength(7);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/swarm/tests/types.test.ts`
Expected: FAIL — types not exported

- [ ] **Step 3: Add squad types to types.ts**

Add to `packages/swarm/src/types.ts`:

```typescript
// --- Squad hierarchy types ---

export type SquadRank = 'director' | 'em' | 'product-lead' | 'architect' | 'senior' | 'junior' | 'qa';
export type AgentDriver = 'claude-code' | 'copilot-cli';
export type AgentModel = 'opus' | 'sonnet' | 'haiku' | 'copilot';

export interface SquadAgent {
  readonly id: string;
  readonly rank: SquadRank;
  readonly driver: AgentDriver;
  readonly model: AgentModel;
  readonly cron: string;
  readonly skills: readonly string[];
}

export interface Squad {
  readonly name: string;
  readonly repo: string;       // repo name or '*' for cross-repo
  readonly em: SquadAgent;
  readonly agents: Readonly<Record<string, SquadAgent>>;
}

export interface SquadManifest {
  readonly version: string;
  readonly org: {
    readonly director: SquadAgent;
  };
  readonly squads: Readonly<Record<string, Squad>>;
  readonly loopGuards: LoopGuardConfig;
}

export interface LoopGuardConfig {
  readonly maxOpenPRsPerSquad: number;
  readonly maxRetries: number;
  readonly maxBlastRadius: number;
  readonly maxRunMinutes: number;
}

export interface SquadState {
  readonly squad: string;
  readonly sprint: {
    readonly goal: string;
    readonly issues: readonly string[];
  };
  readonly assignments: Readonly<Record<string, {
    readonly current: string | null;
    readonly status: string;
    readonly waiting?: string;
  }>>;
  readonly blockers: readonly string[];
  readonly prQueue: {
    readonly open: number;
    readonly reviewed: number;
    readonly mergeable: number;
  };
  readonly updatedAt: string;
}

export interface EMReport {
  readonly squad: string;
  readonly timestamp: string;
  readonly health: 'green' | 'yellow' | 'red';
  readonly summary: string;
  readonly blockers: readonly string[];
  readonly escalations: readonly string[];
  readonly metrics: {
    readonly prsOpened: number;
    readonly prsMerged: number;
    readonly issuesClosed: number;
    readonly denials: number;
    readonly retries: number;
  };
}

export interface DirectorBrief {
  readonly timestamp: string;
  readonly squads: Readonly<Record<string, EMReport>>;
  readonly escalationsForHuman: readonly string[];
  readonly overallHealth: 'green' | 'yellow' | 'red';
}
```

Export from `packages/swarm/src/index.ts`.

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run packages/swarm/tests/types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/swarm/src/types.ts packages/swarm/src/index.ts packages/swarm/tests/types.test.ts
git commit -m "feat(swarm): add squad hierarchy types — SquadManifest, Squad, SquadAgent, LoopGuardConfig"
```

---

### Task 2: Squad manifest YAML loader

**Files:**
- Create: `packages/swarm/src/squad-manifest.ts`
- Create: `packages/swarm/tests/squad-manifest.test.ts`
- Create: `packages/swarm/templates/config/squad-manifest.default.yaml`

- [ ] **Step 1: Create the default manifest YAML**

```yaml
# packages/swarm/templates/config/squad-manifest.default.yaml
version: "1.0.0"

org:
  director:
    id: director
    rank: director
    driver: claude-code
    model: opus
    cron: "0 7,19 * * *"
    skills: [squad-status, director-brief, escalation-router]

squads:
  kernel:
    repo: agent-guard
    em:
      id: kernel-em
      rank: em
      driver: claude-code
      model: opus
      cron: "0 */3 * * *"
      skills: [squad-plan, squad-execute, squad-status, squad-retro, escalation-router]
    agents:
      product-lead:
        id: kernel-pl
        rank: product-lead
        driver: claude-code
        model: sonnet
        cron: "0 6 * * *"
        skills: [sprint-planning, roadmap-expand, backlog-steward, learn]
      architect:
        id: kernel-arch
        rank: architect
        driver: claude-code
        model: opus
        cron: "0 */4 * * *"
        skills: [architecture-review, review-open-prs, eval, evolve]
      senior:
        id: kernel-sr
        rank: senior
        driver: copilot-cli
        model: sonnet
        cron: "0 */2 * * *"
        skills: [claim-issue, implement-issue, create-pr, run-tests]
      junior:
        id: kernel-jr
        rank: junior
        driver: copilot-cli
        model: copilot
        cron: "0 */2 * * *"
        skills: [claim-issue, implement-issue, run-tests, generate-tests]
      qa:
        id: kernel-qa
        rank: qa
        driver: copilot-cli
        model: sonnet
        cron: "0 */3 * * *"
        skills: [e2e-testing, compliance-test, test-health-review, learn, prune]

  cloud:
    repo: agentguard-cloud
    em:
      id: cloud-em
      rank: em
      driver: claude-code
      model: opus
      cron: "0 */3 * * *"
      skills: [squad-plan, squad-execute, squad-status, squad-retro, escalation-router]
    agents:
      product-lead:
        id: cloud-pl
        rank: product-lead
        driver: claude-code
        model: sonnet
        cron: "0 6 * * *"
        skills: [sprint-planning, roadmap-expand, backlog-steward, learn]
      architect:
        id: cloud-arch
        rank: architect
        driver: claude-code
        model: opus
        cron: "0 */4 * * *"
        skills: [architecture-review, review-open-prs, eval, evolve]
      senior:
        id: cloud-sr
        rank: senior
        driver: copilot-cli
        model: sonnet
        cron: "0 */2 * * *"
        skills: [claim-issue, implement-issue, create-pr, run-tests]
      junior:
        id: cloud-jr
        rank: junior
        driver: copilot-cli
        model: copilot
        cron: "0 */2 * * *"
        skills: [claim-issue, implement-issue, run-tests, generate-tests]
      qa:
        id: cloud-qa
        rank: qa
        driver: copilot-cli
        model: sonnet
        cron: "0 */3 * * *"
        skills: [e2e-testing, compliance-test, test-health-review, learn, prune]

  qa:
    repo: "*"
    em:
      id: qa-em
      rank: em
      driver: claude-code
      model: sonnet
      cron: "0 */3 * * *"
      skills: [squad-plan, squad-execute, squad-status, squad-retro, escalation-router]
    agents:
      product-lead:
        id: qa-pl
        rank: product-lead
        driver: claude-code
        model: sonnet
        cron: "0 6 * * *"
        skills: [sprint-planning, test-strategy, stranger-test-plan, learn]
      architect:
        id: qa-arch
        rank: architect
        driver: claude-code
        model: sonnet
        cron: "0 */4 * * *"
        skills: [test-architecture, compliance-review, eval, evolve]
      senior:
        id: qa-sr
        rank: senior
        driver: copilot-cli
        model: sonnet
        cron: "0 */2 * * *"
        skills: [playwright-e2e, stranger-test-run, compliance-test, create-pr]
      junior:
        id: qa-jr
        rank: junior
        driver: copilot-cli
        model: copilot
        cron: "0 */2 * * *"
        skills: [generate-tests, run-tests, test-data-generation]
      qa:
        id: qa-qa
        rank: qa
        driver: copilot-cli
        model: haiku
        cron: "0 */1 * * *"
        skills: [e2e-testing, regression-analysis, flakiness-detection, learn, prune]

loopGuards:
  maxOpenPRsPerSquad: 3
  maxRetries: 3
  maxBlastRadius: 20
  maxRunMinutes: 10
```

- [ ] **Step 2: Write the failing test**

```typescript
// packages/swarm/tests/squad-manifest.test.ts
import { describe, it, expect } from 'vitest';
import { loadSquadManifest } from '../src/squad-manifest.js';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('loadSquadManifest', () => {
  it('loads the default manifest', () => {
    const yaml = readFileSync(
      join(__dirname, '..', 'templates', 'config', 'squad-manifest.default.yaml'),
      'utf8',
    );
    const manifest = loadSquadManifest(yaml);
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.org.director.rank).toBe('director');
    expect(manifest.org.director.driver).toBe('claude-code');
  });

  it('parses all 3 squads', () => {
    const yaml = readFileSync(
      join(__dirname, '..', 'templates', 'config', 'squad-manifest.default.yaml'),
      'utf8',
    );
    const manifest = loadSquadManifest(yaml);
    expect(Object.keys(manifest.squads)).toEqual(['kernel', 'cloud', 'qa']);
  });

  it('each squad has em + 5 agents', () => {
    const yaml = readFileSync(
      join(__dirname, '..', 'templates', 'config', 'squad-manifest.default.yaml'),
      'utf8',
    );
    const manifest = loadSquadManifest(yaml);
    for (const [name, squad] of Object.entries(manifest.squads)) {
      expect(squad.em.rank).toBe('em');
      expect(Object.keys(squad.agents)).toHaveLength(5);
    }
  });

  it('builds agent identity strings', () => {
    const yaml = readFileSync(
      join(__dirname, '..', 'templates', 'config', 'squad-manifest.default.yaml'),
      'utf8',
    );
    const manifest = loadSquadManifest(yaml);
    const sr = manifest.squads.kernel.agents.senior;
    const identity = `${sr.driver}:${sr.model}:kernel:${sr.rank}`;
    expect(identity).toBe('copilot-cli:sonnet:kernel:senior');
  });

  it('parses loop guard config', () => {
    const yaml = readFileSync(
      join(__dirname, '..', 'templates', 'config', 'squad-manifest.default.yaml'),
      'utf8',
    );
    const manifest = loadSquadManifest(yaml);
    expect(manifest.loopGuards.maxOpenPRsPerSquad).toBe(3);
    expect(manifest.loopGuards.maxRetries).toBe(3);
    expect(manifest.loopGuards.maxBlastRadius).toBe(20);
    expect(manifest.loopGuards.maxRunMinutes).toBe(10);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run packages/swarm/tests/squad-manifest.test.ts`
Expected: FAIL — `loadSquadManifest` not found

- [ ] **Step 4: Implement squad manifest loader**

```typescript
// packages/swarm/src/squad-manifest.ts
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
```

Add `yaml` dependency: `pnpm add yaml --filter=@red-codes/swarm`

Export from `packages/swarm/src/index.ts`.

- [ ] **Step 5: Run tests**

Run: `pnpm vitest run packages/swarm/tests/squad-manifest.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/swarm/
git commit -m "feat(swarm): squad manifest YAML loader with identity builder/parser"
```

---

### Task 3: Squad state reader/writer

**Files:**
- Create: `packages/swarm/src/squad-state.ts`
- Create: `packages/swarm/tests/squad-state.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/swarm/tests/squad-state.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readSquadState, writeSquadState, readEMReport, writeEMReport, readDirectorBrief, writeDirectorBrief } from '../src/squad-state.js';
import { mkdtempSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('squad state', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'squad-'));
    mkdirSync(join(dir, '.agentguard', 'squads', 'kernel'), { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes and reads squad state', () => {
    const state = {
      squad: 'kernel',
      sprint: { goal: 'Go kernel Phase 2', issues: ['#860'] },
      assignments: {
        senior: { current: '#860', status: 'implementing' },
      },
      blockers: [],
      prQueue: { open: 1, reviewed: 0, mergeable: 0 },
      updatedAt: new Date().toISOString(),
    };
    writeSquadState(dir, 'kernel', state);
    const read = readSquadState(dir, 'kernel');
    expect(read?.squad).toBe('kernel');
    expect(read?.sprint.goal).toBe('Go kernel Phase 2');
  });

  it('returns null for missing state', () => {
    const read = readSquadState(dir, 'nonexistent');
    expect(read).toBeNull();
  });

  it('writes and reads EM report', () => {
    const report = {
      squad: 'kernel',
      timestamp: new Date().toISOString(),
      health: 'green' as const,
      summary: 'All clear',
      blockers: [],
      escalations: [],
      metrics: { prsOpened: 2, prsMerged: 1, issuesClosed: 3, denials: 0, retries: 0 },
    };
    writeEMReport(dir, 'kernel', report);
    const read = readEMReport(dir, 'kernel');
    expect(read?.health).toBe('green');
  });

  it('writes and reads director brief', () => {
    const brief = {
      timestamp: new Date().toISOString(),
      squads: {},
      escalationsForHuman: ['Need decision on Go vs Rust for hot path'],
      overallHealth: 'yellow' as const,
    };
    writeDirectorBrief(dir, brief);
    const read = readDirectorBrief(dir);
    expect(read?.overallHealth).toBe('yellow');
    expect(read?.escalationsForHuman).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/swarm/tests/squad-state.test.ts`
Expected: FAIL — functions not found

- [ ] **Step 3: Implement state reader/writer**

```typescript
// packages/swarm/src/squad-state.ts
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
```

Export from `packages/swarm/src/index.ts`.

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run packages/swarm/tests/squad-state.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/swarm/
git commit -m "feat(swarm): squad state reader/writer for state, EM reports, director briefs"
```

---

### Task 4: Loop guards

**Files:**
- Create: `packages/swarm/src/loop-guards.ts`
- Create: `packages/swarm/tests/loop-guards.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/swarm/tests/loop-guards.test.ts
import { describe, it, expect } from 'vitest';
import { checkLoopGuards } from '../src/loop-guards.js';
import type { LoopGuardConfig, SquadState } from '../src/types.js';

const defaultGuards: LoopGuardConfig = {
  maxOpenPRsPerSquad: 3,
  maxRetries: 3,
  maxBlastRadius: 20,
  maxRunMinutes: 10,
};

describe('loop guards', () => {
  it('passes when all guards clear', () => {
    const state: SquadState = {
      squad: 'kernel',
      sprint: { goal: 'test', issues: [] },
      assignments: {},
      blockers: [],
      prQueue: { open: 1, reviewed: 0, mergeable: 0 },
      updatedAt: new Date().toISOString(),
    };
    const result = checkLoopGuards(defaultGuards, state, {
      retryCount: 0,
      predictedFileChanges: 5,
      runStartTime: Date.now(),
    });
    expect(result.allowed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('fails budget guard when too many PRs open', () => {
    const state: SquadState = {
      squad: 'kernel',
      sprint: { goal: 'test', issues: [] },
      assignments: {},
      blockers: [],
      prQueue: { open: 4, reviewed: 0, mergeable: 0 },
      updatedAt: new Date().toISOString(),
    };
    const result = checkLoopGuards(defaultGuards, state, {
      retryCount: 0,
      predictedFileChanges: 5,
      runStartTime: Date.now(),
    });
    expect(result.allowed).toBe(false);
    expect(result.violations).toContain('budget');
  });

  it('fails retry guard after 3 retries', () => {
    const state: SquadState = {
      squad: 'kernel',
      sprint: { goal: 'test', issues: [] },
      assignments: {},
      blockers: [],
      prQueue: { open: 0, reviewed: 0, mergeable: 0 },
      updatedAt: new Date().toISOString(),
    };
    const result = checkLoopGuards(defaultGuards, state, {
      retryCount: 4,
      predictedFileChanges: 5,
      runStartTime: Date.now(),
    });
    expect(result.allowed).toBe(false);
    expect(result.violations).toContain('retry');
  });

  it('fails blast radius guard when too many files', () => {
    const state: SquadState = {
      squad: 'kernel',
      sprint: { goal: 'test', issues: [] },
      assignments: {},
      blockers: [],
      prQueue: { open: 0, reviewed: 0, mergeable: 0 },
      updatedAt: new Date().toISOString(),
    };
    const result = checkLoopGuards(defaultGuards, state, {
      retryCount: 0,
      predictedFileChanges: 25,
      runStartTime: Date.now(),
    });
    expect(result.allowed).toBe(false);
    expect(result.violations).toContain('blast-radius');
  });

  it('fails time guard when run exceeds limit', () => {
    const state: SquadState = {
      squad: 'kernel',
      sprint: { goal: 'test', issues: [] },
      assignments: {},
      blockers: [],
      prQueue: { open: 0, reviewed: 0, mergeable: 0 },
      updatedAt: new Date().toISOString(),
    };
    const result = checkLoopGuards(defaultGuards, state, {
      retryCount: 0,
      predictedFileChanges: 5,
      runStartTime: Date.now() - 11 * 60 * 1000, // 11 min ago
    });
    expect(result.allowed).toBe(false);
    expect(result.violations).toContain('time');
  });

  it('reports multiple violations', () => {
    const state: SquadState = {
      squad: 'kernel',
      sprint: { goal: 'test', issues: [] },
      assignments: {},
      blockers: [],
      prQueue: { open: 5, reviewed: 0, mergeable: 0 },
      updatedAt: new Date().toISOString(),
    };
    const result = checkLoopGuards(defaultGuards, state, {
      retryCount: 4,
      predictedFileChanges: 25,
      runStartTime: Date.now() - 15 * 60 * 1000,
    });
    expect(result.allowed).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/swarm/tests/loop-guards.test.ts`
Expected: FAIL — `checkLoopGuards` not found

- [ ] **Step 3: Implement loop guards**

```typescript
// packages/swarm/src/loop-guards.ts
import type { LoopGuardConfig, SquadState } from './types.js';

export interface LoopGuardContext {
  retryCount: number;
  predictedFileChanges: number;
  runStartTime: number;
}

export type GuardViolation = 'budget' | 'retry' | 'blast-radius' | 'cascade' | 'time';

export interface LoopGuardResult {
  allowed: boolean;
  violations: GuardViolation[];
  messages: string[];
}

export function checkLoopGuards(
  config: LoopGuardConfig,
  state: SquadState,
  context: LoopGuardContext,
): LoopGuardResult {
  const violations: GuardViolation[] = [];
  const messages: string[] = [];

  // 1. Budget guard
  if (state.prQueue.open >= config.maxOpenPRsPerSquad) {
    violations.push('budget');
    messages.push(
      `PR budget exceeded: ${state.prQueue.open} open (max ${config.maxOpenPRsPerSquad}). Skip implementation, focus on review/merge.`,
    );
  }

  // 2. Retry guard
  if (context.retryCount > config.maxRetries) {
    violations.push('retry');
    messages.push(
      `Retry limit exceeded: ${context.retryCount} attempts (max ${config.maxRetries}). Create escalation issue.`,
    );
  }

  // 3. Blast radius guard
  if (context.predictedFileChanges > config.maxBlastRadius) {
    violations.push('blast-radius');
    messages.push(
      `Blast radius exceeded: ${context.predictedFileChanges} files (max ${config.maxBlastRadius}). Escalate to Architect.`,
    );
  }

  // 4. Time guard
  const elapsedMs = Date.now() - context.runStartTime;
  const elapsedMin = elapsedMs / 60_000;
  if (elapsedMin > config.maxRunMinutes) {
    violations.push('time');
    messages.push(
      `Run time exceeded: ${Math.round(elapsedMin)}min (max ${config.maxRunMinutes}min). Force-stop, EM investigates.`,
    );
  }

  return {
    allowed: violations.length === 0,
    violations,
    messages,
  };
}
```

Export from `packages/swarm/src/index.ts`.

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run packages/swarm/tests/loop-guards.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/swarm/
git commit -m "feat(swarm): 5-layer loop guards — budget, retry, blast radius, cascade, time"
```

---

### Task 5: Identity format integration + scaffolder update

**Files:**
- Modify: `packages/swarm/src/scaffolder.ts`
- Create: `packages/swarm/tests/squad-scaffold.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/swarm/tests/squad-scaffold.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { scaffoldSquad } from '../src/scaffolder.js';
import { loadSquadManifest } from '../src/squad-manifest.js';
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('scaffoldSquad', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'scaffold-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates .agentguard-identity for each agent', () => {
    const yaml = readFileSync(
      join(__dirname, '..', 'templates', 'config', 'squad-manifest.default.yaml'),
      'utf8',
    );
    const manifest = loadSquadManifest(yaml);
    scaffoldSquad(dir, 'kernel', manifest.squads.kernel);

    // Check that squad state dir exists
    expect(existsSync(join(dir, '.agentguard', 'squads', 'kernel'))).toBe(true);
  });

  it('creates initial empty squad state', () => {
    const yaml = readFileSync(
      join(__dirname, '..', 'templates', 'config', 'squad-manifest.default.yaml'),
      'utf8',
    );
    const manifest = loadSquadManifest(yaml);
    scaffoldSquad(dir, 'kernel', manifest.squads.kernel);

    const statePath = join(dir, '.agentguard', 'squads', 'kernel', 'state.json');
    expect(existsSync(statePath)).toBe(true);
    const state = JSON.parse(readFileSync(statePath, 'utf8'));
    expect(state.squad).toBe('kernel');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/swarm/tests/squad-scaffold.test.ts`
Expected: FAIL — `scaffoldSquad` not found

- [ ] **Step 3: Implement scaffoldSquad**

Add to `packages/swarm/src/scaffolder.ts`:

```typescript
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Squad, SquadState } from './types.js';

export function scaffoldSquad(root: string, squadName: string, squad: Squad): void {
  const squadDir = join(root, '.agentguard', 'squads', squadName);
  mkdirSync(squadDir, { recursive: true });

  // Write initial squad state
  const initialState: SquadState = {
    squad: squadName,
    sprint: { goal: '', issues: [] },
    assignments: {},
    blockers: [],
    prQueue: { open: 0, reviewed: 0, mergeable: 0 },
    updatedAt: new Date().toISOString(),
  };

  const statePath = join(squadDir, 'state.json');
  if (!existsSync(statePath)) {
    writeFileSync(statePath, JSON.stringify(initialState, null, 2), 'utf8');
  }

  // Write learnings store
  const learningsPath = join(squadDir, 'learnings.json');
  if (!existsSync(learningsPath)) {
    writeFileSync(learningsPath, '[]', 'utf8');
  }
}
```

Export from `packages/swarm/src/index.ts`.

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run packages/swarm/tests/squad-scaffold.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/swarm/
git commit -m "feat(swarm): scaffoldSquad creates state dirs, initial state, learnings store"
```

---

### Task 6: Build, full test suite, docs update

- [ ] **Step 1: Run full swarm package tests**

```bash
pnpm test --filter=@red-codes/swarm
```
Expected: all PASS

- [ ] **Step 2: Run full monorepo tests**

```bash
pnpm build && pnpm test
```
Expected: all PASS (no regressions from new types/exports)

- [ ] **Step 3: Update swarm README**

Add a "Squad Structure" section to `packages/swarm/README.md` documenting:
- Squad manifest schema
- Identity format (`driver:model:squad:rank`)
- Loop guards
- State file locations
- Migration from 26-agent flat pool

- [ ] **Step 4: Commit**

```bash
git add packages/swarm/
git commit -m "docs(swarm): update README with squad structure, identity format, loop guards"
```

---

### Task 7: Deploy manifest + scaffold squads across repos

- [ ] **Step 1: Copy default manifest to workspace repos**

```bash
# agent-guard
cp packages/swarm/templates/config/squad-manifest.default.yaml .agentguard/squad-manifest.yaml

# agentguard-cloud
cp packages/swarm/templates/config/squad-manifest.default.yaml ../agentguard-cloud/.agentguard/squad-manifest.yaml
```

- [ ] **Step 2: Run scaffold for each squad**

Create a script or run manually:

```bash
# From agent-guard root
node -e "
const { loadSquadManifest, scaffoldSquad } = require('./packages/swarm/dist/index.js');
const { readFileSync } = require('fs');
const yaml = readFileSync('.agentguard/squad-manifest.yaml', 'utf8');
const manifest = loadSquadManifest(yaml);
for (const [name, squad] of Object.entries(manifest.squads)) {
  if (squad.repo === 'agent-guard' || squad.repo === '*') {
    scaffoldSquad('.', name, squad);
    console.log('Scaffolded squad:', name);
  }
}
"
```

- [ ] **Step 3: Verify state files created**

```bash
ls -la .agentguard/squads/kernel/
ls -la .agentguard/squads/qa/
# Expected: state.json, learnings.json in each
```

- [ ] **Step 4: Commit manifests and state files**

```bash
git add .agentguard/squad-manifest.yaml .agentguard/squads/
git commit -m "chore: deploy squad manifest and scaffold kernel + qa squads"
```
