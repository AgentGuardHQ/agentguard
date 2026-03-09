# Roadmap

> Deterministic governance. Roguelike debugging. One event model.

## Vision

AgentGuard + BugMon is a unified platform where **governance produces events** and **gameplay consumes them**.

AgentGuard provides deterministic governance for AI coding agents — policy evaluation, invariant monitoring, blast radius limits, evidence generation. BugMon provides the developer interaction layer — a roguelike where coding sessions become dungeon runs and real errors become enemies.

The canonical event model connects everything. Developer signals, agent actions, CI failures, and governance violations all normalize into the same event schema. BugMon renders those events as a hybrid idle/active roguelike: minor enemies auto-resolve in the background while bosses demand active engagement.

### Core Loop

```
developer codes
    ↓
errors / failures / violations produce events
    ↓
events normalize through pipeline
    ↓
AgentGuard evaluates governance
    ↓
BugMon generates encounters
    ↓
dungeon runner auto-resolves minor enemies (idle)
bosses pause for engagement (active)
    ↓
Bug Grimoire records defeated enemy types
gold + XP accumulate across runs
    ↑                              |
    └──────────────────────────────┘
```

---

## Phase 0 — Architecture Clarity `COMPLETE`

> **Theme:** Define the unified system model

Establish the conceptual architecture, documentation, and event model that connects AgentGuard and BugMon.

- [x] Canonical event model documentation (`docs/event-model.md`)
- [x] AgentGuard governance runtime specification (`docs/agentguard.md`)
- [x] Roguelike design document (`docs/roguelike-design.md`)
- [x] Bug event pipeline documentation (`docs/bug-event-pipeline.md`)
- [x] Unified architecture document (`docs/unified-architecture.md`)
- [x] Plugin API specification (`docs/plugin-api.md`)
- [x] Sequence diagrams (`docs/sequence-diagrams.md`)
- [x] Product positioning (`docs/product-positioning.md`)
- [x] Rewritten README, ARCHITECTURE, ROADMAP
- [x] Updated CLAUDE.md

## Phase 1 — Canonical Event Model `COMPLETE`

> **Theme:** Formalize the event spine

Extend the existing event system (`src/domain/events.ts`, `src/core/event-bus.ts`) into the formal canonical event model.

- [x] Full event type taxonomy (developer signals, governance events, session events)
- [x] Event schema validation
- [x] Governance event types: `InvariantViolation`, `UnauthorizedAction`, `PolicyDenied`, `BlastRadiusExceeded`, `MergeGuardFailure`
- [x] Session event types: `RunStarted`, `RunEnded`, `CheckpointReached`
- [x] Developer signal event types: `FileSaved`, `TestCompleted`, `BuildCompleted`, `CommitCreated`, `CodeReviewed`, `DeployCompleted`, `LintCompleted`
- [x] Event factory with fingerprint generation
- [x] Event store interface (persist, query, replay)
- [x] Tests for all event types and lifecycle

## Phase 2 — AgentGuard Governance Runtime `MOSTLY COMPLETE`

> **Theme:** Deterministic agent governance

Build the governance runtime that evaluates agent actions against policies and invariants.

- [x] Action Authorization Boundary (AAB) implementation (`src/agentguard/core/aab.ts`)
- [x] Policy definition format (JSON) (`policy/action_rules.json`, `policy/capabilities.json`)
- [x] Policy loader and parser (`src/agentguard/policies/loader.ts`)
- [x] Deterministic policy evaluator (`src/agentguard/policies/evaluator.ts`)
- [x] Invariant monitoring engine (`src/agentguard/invariants/checker.ts`)
- [x] Built-in invariants (`src/agentguard/invariants/definitions.ts`)
- [ ] Blast radius computation
- [x] Evidence pack generation and persistence (`src/agentguard/evidence/pack.ts`)
- [ ] CLI governance commands (`agentguard guard`, `agentguard audit`)
- [x] Governance event emission into canonical event model (via `src/domain/events.ts`)
- [ ] Integration with Claude Code hook (governance events from agent actions)

## Phase 3 — BugMon Browser Dungeon Runner `COMPLETE`

> **Theme:** Coding sessions become dungeon runs

Implement the roguelike dungeon runner with hybrid idle/active encounters in the browser.

- [x] Idle dungeon runner (auto-run through procedural floors)
- [x] Auto-resolve minor enemies (severity 1-2) inline with floating combat text
- [x] Boss encounters pause for player input (severity 3+)
- [x] Procedural floor generation (rooms, corridors, treasure, exits)
- [x] Premium dark aesthetic (OLED + gold/cyan accents, glassmorphic HUD)
- [x] Dev character with hoodie + laptop sprite and running animation
- [x] Gold and loot persistence via localStorage
- [x] Floor progression with increasing difficulty
- [x] Parallax scrolling dungeon renderer
- [x] Sound effects for combat, treasure, and floor transitions

## Phase 4 — Event Persistence + Replay `PARTIALLY COMPLETE`

> **Theme:** Every session is replayable

Implement durable event storage and deterministic replay.

- [x] File-based event store (`src/domain/event-store.ts`)
- [x] Event stream serialization (NDJSON)
- [x] Session metadata (run ID, RNG seed, timestamps)
- [x] Execution event log (`src/domain/execution/`)
- [x] CLI replay command (`agentguard replay`)
- [ ] Deterministic replay with seeded RNG
- [ ] Replay comparator (verify original vs replayed outcomes)
- [ ] Event export/import for sharing sessions

## Phase 5 — Bug Grimoire + Progression `PARTIALLY COMPLETE`

> **Theme:** Meta-progression across runs

Build the persistent progression system that spans coding sessions.

- [x] Bug Grimoire: enemy compendium with defeat history (`src/meta/bugdex.ts`)
- [x] XP and leveling
- [x] Dev-activity progression via git hooks (commits, PRs, bug fixes)
- [x] Evolution chains with activity-based triggers
- [x] Gold economy (dungeon runner loot)
- [ ] Grimoire completion tracking and unlock rewards
- [ ] Achievement system (first boss, perfect run, 100% Grimoire, etc.)
- [ ] Lifetime statistics aggregation
- [ ] Developer level with title progression
- [ ] Difficulty scaling based on developer level
- [ ] Session leaderboard (best scores, fastest boss defeats)

## Phase 6 — Plugin Ecosystem `CURRENT`

> **Theme:** Extensible by design

Formalize the plugin system for third-party extensions.

- [x] Event source plugin interface (`src/domain/source-registry.ts`)
- [ ] Content pack loading system (community enemies, moves, bosses)
- [ ] Renderer plugin interface
- [ ] Policy pack loading system
- [ ] Replay processor interface
- [ ] Plugin validation and sandboxing
- [ ] Plugin registry / discovery mechanism
- [ ] Language-specific content packs (Python BugMon, Go BugMon, Rust BugMon)

## Phase 7 — Terminal Roguelike MVP

> **Theme:** Terminal-native dungeon experience

Bring the dungeon runner experience to the terminal CLI.

- [ ] Run engine in terminal (session-scoped gameplay lifecycle)
- [ ] Idle mode: auto-resolve minor enemies in background with ANSI output
- [ ] Active mode: interrupt for bosses and elites
- [ ] Configurable idle/active threshold
- [ ] Encounter difficulty scaling based on session context
- [ ] Session escalation (unresolved errors compound difficulty)
- [ ] Run summary and scoring at session end
- [ ] Governance boss encounters from AgentGuard events
- [ ] Bug Grimoire terminal display
- [ ] Run statistics (encounters, defeats, score, duration)

## Phase 8 — Editor Integrations

> **Theme:** The game moves into the editor

Bring BugMon encounters and AgentGuard governance into editor environments.

- [ ] VS Code extension: sidebar webview with run status
- [ ] VS Code: real-time error interception from diagnostics API
- [ ] VS Code: inline enemy encounters on error hover
- [ ] VS Code: Bug Grimoire panel
- [ ] VS Code: governance notifications for AgentGuard events
- [ ] JetBrains plugin (IntelliJ/WebStorm)
- [ ] Claude Code deep integration (governance-aware encounters)

## Phase 9 — AI-Assisted Debugging

> **Theme:** Explicitly deferred. Requires Phase 2 + 3 + 4.

AI features are intentionally placed last. The system must be useful without AI before AI is layered on.

- [ ] Context-aware fix suggestions based on error type + stack trace
- [ ] AI-suggested battle strategies based on error context
- [ ] Automated fix verification (does the fix resolve the event?)
- [ ] AI pattern detection (recurring error clusters across sessions)
- [ ] Team observability (aggregate Grimoire across a dev team)

---

## Current Enemy Roster (34 BugMon)

### Base Forms (24)

| # | Name | Type | Rarity |
|---|------|------|--------|
| 1 | NullPointer | backend | common |
| 2 | CallbackHell | backend | common |
| 3 | RaceCondition | backend | uncommon |
| 4 | MemoryLeak | backend | common |
| 5 | DivSoup | frontend | common |
| 6 | SpinnerOfDoom | frontend | common |
| 7 | StateHydra | frontend | uncommon |
| 8 | MergeConflict | devops | common |
| 9 | CIPhantom | devops | uncommon |
| 10 | DockerDaemon | devops | common |
| 11 | FlakyTest | testing | common |
| 12 | AssertionError | testing | common |
| 13 | Monolith | architecture | uncommon |
| 14 | CleanArchitecture | architecture | uncommon |
| 15 | SQLInjector | security | uncommon |
| 16 | XSSpecter | security | uncommon |
| 17 | PromptGoblin | ai | uncommon |
| 18 | HalluciBot | ai | common |
| 19 | TheSingularity | ai | legendary |
| 20 | TheLegacySystem | architecture | legendary |
| 31 | TodoComment | testing | common |
| 32 | InvariantBeast | testing | uncommon |
| 33 | RogueAgent | security | uncommon |
| 34 | ChaosHydra | architecture | uncommon |

### Evolved Forms (10)

| # | Name | Type | Evolves From | Trigger |
|---|------|------|-------------|---------|
| 21 | OptionalChaining | backend | NullPointer | Fix 5 bugs |
| 22 | TypeSafety | backend | OptionalChaining | Pass 10 test runs |
| 23 | PromiseChain | backend | CallbackHell | Make 10 commits |
| 24 | AsyncAwait | backend | PromiseChain | Merge 3 PRs |
| 25 | Flexbox | frontend | DivSoup | Perform 5 refactors |
| 26 | CSSGrid | frontend | Flexbox | Complete 5 code reviews |
| 27 | RebaseMaster | devops | MergeConflict | Resolve 5 merge conflicts |
| 28 | Microservice | architecture | Monolith | Deploy 5 times |
| 29 | GarbageCollector | backend | MemoryLeak | Pass 8 CI builds |
| 30 | PromptEngineer | ai | PromptGoblin | Write 5 docs |

### Enemy Ideas Backlog

| Name | Type | Concept |
|------|------|---------|
| SegFaultling | backend | Illegal access creature |
| TypeCoercion | backend | Shapeshifter |
| ZeroDivide | backend | Approaches infinity |
| BitRot | backend | Decays over time |
| PhantomRead | backend | Reads data that was never written |
| KernelPanic | backend | The nuclear option |
| DarkPattern | frontend | Manipulative, tricks opponents |
| LeftPadCollapse | devops | One small removal breaks everything |
| CopilotShadow | ai | Writes code that almost works |
| ScopeCreep | architecture | Grows larger every turn |
| InvariantBreaker | governance | Violates system rules |
| PolicyPhantom | governance | Bypasses authorization |

---

## Size Budget

Every feature must fit within the byte budget:

| Metric | Target | Hard Cap |
|--------|-------:|--------:|
| Bundle (gzipped, no sprites) | 10 KB | 17 KB |
| Bundle (gzipped, with sprites) | ~19 KB | 32 KB |

Run `npm run budget` to check compliance.

## TypeScript Migration `COMPLETE`

> **Theme:** TypeScript as single source of truth

TypeScript in `src/` is now the **single source of truth** for all system code. The migration from JavaScript to TypeScript is complete.

**Current state:**
- `src/` directory with 134 TypeScript files across `cli/`, `core/`, `game/`, `domain/`, `agentguard/`, `meta/`, `orchestration/`, `protocol/`, `content/`, `watchers/`, `ai/`
- `tsconfig.json` — strict mode, ES2022 target, rootDir: `src/`, outDir: `dist/`
- `vitest.config.ts` — test runner for TypeScript tests (16 test files)
- `esbuild.config.ts` — builds CLI and game bundles from TS sources
- Runtime dependencies for CLI: `chokidar`, `commander`, `pino`
- Browser game remains zero-dependency

**Build pipeline:**
- `npm run build:ts` — Build TypeScript (tsc + esbuild → dist/)
- `npm run ts:check` — Type-check (tsc --noEmit)
- `npm run ts:test` — Run TS tests (vitest)

**Key architectural addition (latest):**
- Idle dungeon runner (`src/game/dungeon/`) — 4 files, ~1,400 lines
- Premium dark design system (`src/game/theme.ts`) — OLED palette, gold accents, glassmorphism
- Battle visual effects (`src/game/engine/effects.ts`)

## Legend

- **Status:** `COMPLETE` | `MOSTLY COMPLETE` | `PARTIALLY COMPLETE` | `CURRENT` | `PLANNED`
