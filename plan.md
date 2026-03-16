# KCP Integration Plan for AgentGuard

## Overview

Integrate the [Knowledge Context Protocol (KCP)](https://github.com/Cantara/knowledge-context-protocol) into AgentGuard at two levels:

1. **AgentGuard's own `knowledge.yaml`** — Make our codebase navigable by AI agents via KCP
2. **New `packages/kcp/` package** — Parse project KCP manifests and enrich governance decisions with file-level metadata (scope, intent, dependencies, sensitivity)

## Why This Fits

KCP's per-file metadata (scope, sensitivity, audience, dependencies, triggers) maps directly onto AgentGuard's governance concerns:

| KCP Field | AgentGuard Use |
|-----------|---------------|
| `scope: global` | Higher blast-radius weight for global-scope files |
| `sensitivity: confidential` | Invariant: block agent writes to confidential files |
| `depends_on` | Blast-radius: writing to a file with 10 dependents = higher score |
| `kind: policy` | Auto-detect governance-relevant files |
| `deprecated: true` | Warn/deny writes to deprecated files |
| `audience: [human]` | Flag if agent modifies human-only documentation |

## Implementation Steps

### Step 1: Create `packages/kcp/` workspace package

New package `@red-codes/kcp` with the standard monorepo structure:

```
packages/kcp/
├── src/
│   ├── index.ts           # Public exports
│   ├── types.ts           # KCP manifest types (KcpManifest, KnowledgeUnit, etc.)
│   ├── loader.ts          # Parse & validate knowledge.yaml (YAML + JSON)
│   ├── resolver.ts        # Resolve knowledge units by file path, action target, triggers
│   └── enricher.ts        # Build KCP-enriched systemContext for kernel
├── tests/
│   └── kcp.test.ts        # Unit tests
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

**`types.ts`** — TypeScript types mirroring KCP v0.10 schema:
- `KcpManifest`: root manifest (kcp_version, project, version, units, relationships, etc.)
- `KnowledgeUnit`: per-unit (id, path, intent, scope, audience, kind, sensitivity, depends_on, triggers, etc.)
- `KcpRelationship`: typed directional links (enables, context, supersedes, contradicts, depends_on, governs)

**`loader.ts`** — Manifest loader:
- `loadKcpManifest(path: string): KcpManifest` — parse YAML/JSON, validate required fields
- Reuse `@red-codes/policy`'s YAML loader pattern (js-yaml)
- Validate: kcp_version, project, version, units array, unit.id/path/intent/scope/audience

**`resolver.ts`** — Knowledge unit resolution:
- `resolveByPath(manifest: KcpManifest, filePath: string): KnowledgeUnit | null`
- `resolveByTrigger(manifest: KcpManifest, keywords: string[]): KnowledgeUnit[]`
- `getDependents(manifest: KcpManifest, unitId: string): KnowledgeUnit[]` — files that depend on this unit
- `getRelationships(manifest: KcpManifest, unitId: string): KcpRelationship[]`

**`enricher.ts`** — SystemContext enrichment:
- `enrichContext(manifest: KcpManifest, rawAction: RawAgentAction, context: Record<string, unknown>): Record<string, unknown>`
- Looks up the action's target file in the manifest
- Adds to context: `kcpScope`, `kcpSensitivity`, `kcpDependentCount`, `kcpKind`, `kcpDeprecated`, `kcpAudience`
- These flow through `systemContext` → `buildSystemState()` → invariant checker

### Step 2: Add KCP-aware fields to `SystemState`

Extend `packages/invariants/src/checker.ts`'s `buildSystemState()` to recognize KCP fields:

```typescript
// New optional fields on SystemState
kcpScope?: 'global' | 'project' | 'module';
kcpSensitivity?: 'public' | 'internal' | 'confidential' | 'restricted';
kcpDependentCount?: number;
kcpKind?: string;
kcpDeprecated?: boolean;
kcpAudience?: string[];
```

### Step 3: Add KCP-based invariant

Add one new invariant to `packages/invariants/src/definitions.ts`:

**`kcp-sensitivity-guard`**: Deny agent writes to files with `sensitivity: confidential | restricted`

This leverages the existing invariant pattern — pure function checking SystemState fields.

### Step 4: Add KCP condition to policy evaluator

Extend `PolicyRule.conditions` in `packages/policy/src/evaluator.ts`:

```typescript
conditions?: {
  // ... existing conditions ...
  kcp?: {
    scope?: string[];           // Match when target file's KCP scope is one of these
    sensitivity?: string[];     // Match when sensitivity level is one of these
    minDependents?: number;     // Match when dependent count >= threshold
    kind?: string[];            // Match when file kind is one of these
    deprecated?: boolean;       // Match when file is deprecated
  };
};
```

This allows policy rules like:
```yaml
- action: "file.write"
  effect: deny
  conditions:
    kcp:
      sensitivity: [confidential, restricted]
  reason: "Cannot write to confidential files"
```

### Step 5: KCP-aware blast radius weights

In `packages/kernel/src/blast-radius.ts`, add optional KCP multipliers:
- `global` scope files get a 2x multiplier (they affect everything)
- Files with high `dependentCount` get scaled multipliers
- `confidential`/`restricted` sensitivity gets a 3x multiplier

### Step 6: Create `knowledge.yaml` for AgentGuard itself

Root-level `knowledge.yaml` describing AgentGuard's own codebase:

```yaml
kcp_version: "0.10"
project: agentguard
version: 1.0.0
updated: "2026-03-16"
language: en
license: Apache-2.0

units:
  - id: architecture
    path: ARCHITECTURE.md
    intent: "How is AgentGuard architecturally organized?"
    scope: global
    audience: [agent, developer, architect]
    kind: knowledge
    priority: critical

  - id: claude-guide
    path: CLAUDE.md
    intent: "How should AI assistants interact with this codebase?"
    scope: global
    audience: [agent]
    kind: policy
    priority: critical

  - id: kernel
    path: packages/kernel/src/kernel.ts
    intent: "How does the governed action kernel orchestrate actions?"
    scope: global
    audience: [developer, agent]
    kind: knowledge
    depends_on: [policy-evaluator, invariant-checker, aab]
    sensitivity: internal

  - id: aab
    path: packages/kernel/src/aab.ts
    intent: "How are raw agent actions normalized into intents?"
    scope: global
    audience: [developer, agent]
    kind: knowledge

  - id: policy-evaluator
    path: packages/policy/src/evaluator.ts
    intent: "How are policy rules matched against actions?"
    scope: global
    audience: [developer, agent]
    kind: knowledge

  - id: invariant-checker
    path: packages/invariants/src/checker.ts
    intent: "How are system invariants checked?"
    scope: global
    audience: [developer, agent]
    kind: knowledge

  - id: invariant-defs
    path: packages/invariants/src/definitions.ts
    intent: "What invariants does AgentGuard enforce?"
    scope: global
    audience: [developer, agent, operator]
    kind: policy

  - id: event-schema
    path: packages/events/src/schema.ts
    intent: "What event kinds does the system emit?"
    scope: global
    audience: [developer, agent]
    kind: schema

  - id: default-policy
    path: agentguard.yaml
    intent: "What is the default governance policy?"
    scope: global
    audience: [operator, agent]
    kind: policy
    priority: critical

  # ... additional units for CLI commands, adapters, etc.

relationships:
  - from: kernel
    to: policy-evaluator
    type: depends_on
  - from: kernel
    to: invariant-checker
    type: depends_on
  - from: kernel
    to: aab
    type: depends_on
  - from: claude-guide
    to: architecture
    type: context
```

### Step 7: Wire into kernel startup

In `apps/cli/src/commands/guard.ts` (or wherever the kernel is initialized):
- If a `knowledge.yaml` exists in the project root, load it
- Pass the loaded manifest to the enricher
- Wrap `kernel.propose()` calls to enrich `systemContext` with KCP data before proposing

### Step 8: Register in monorepo

- Add `packages/kcp` to `tsconfig.json` references
- Turbo and pnpm workspace will auto-discover via `packages/*` glob
- Add `@red-codes/kcp` as dependency of `@red-codes/kernel` and `apps/cli`

### Step 9: Tests

- `packages/kcp/tests/kcp.test.ts`: loader, resolver, enricher unit tests
- Update `packages/invariants/tests/`: test the new `kcp-sensitivity-guard` invariant
- Update `packages/policy/tests/`: test KCP policy conditions
- Update `packages/kernel/tests/`: test KCP-enriched blast radius

## Files Modified

| File | Change |
|------|--------|
| `packages/kcp/` (new) | Entire new package |
| `knowledge.yaml` (new) | AgentGuard's own KCP manifest |
| `packages/invariants/src/definitions.ts` | Add `kcp-sensitivity-guard` invariant |
| `packages/invariants/src/checker.ts` | Add KCP fields to `SystemState` + `buildSystemState()` |
| `packages/policy/src/evaluator.ts` | Add `kcp` condition type to `PolicyRule` |
| `packages/kernel/src/blast-radius.ts` | Add KCP-aware weight multipliers |
| `tsconfig.json` | Add `packages/kcp` project reference |
| `apps/cli/src/commands/guard.ts` | Load `knowledge.yaml` and wire enricher |

## Non-Goals (for this PR)

- No remote KCP manifest fetching (federation) — local-only for now
- No KCP manifest editor/generator CLI command — future work
- No changes to MCP server tools — can add `query_kcp` tool later
- No KCP validation CLI command — future work
