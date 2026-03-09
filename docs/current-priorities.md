# Current Priorities

## Active Phase: Phase 6 — Plugin Ecosystem

The system has completed its core architecture (Phases 0-3) and is now focused on extensibility. The governance runtime, canonical event model, and browser dungeon runner are all operational.

## What Is Implemented

The following systems are built and operational:

### Event Pipeline
- Error parser with 40+ patterns across JS, TS, Python, Go, Rust, Java (`src/core/error-parser.ts`)
- Stack trace parser for 6+ frame formats (`src/core/stacktrace-parser.ts`)
- Stable fingerprinting for event deduplication (`src/domain/ingestion/fingerprint.ts`)
- Event classification with severity mapping (`src/core/bug-event.ts`)
- Pipeline orchestration (`src/domain/ingestion/pipeline.ts`)
- Universal EventBus (`src/domain/event-bus.ts`, `src/core/event-bus.ts`)
- Canonical event definitions (`src/domain/events.ts`)
- Developer signal event types (`src/domain/dev-event.ts`)
- Event store interface (`src/domain/event-store.ts`)
- Execution event log with causal chains (`src/domain/execution/`)

### Battle Engine
- Pure deterministic battle engine with injected RNG (`src/domain/battle.ts`)
- Damage formula with type effectiveness and critical hits
- Passive abilities (RandomFailure, NonDeterministic)
- Healing moves
- Combat system with turn-based battles
- Battle simulation framework with seeded RNG (`simulation/`)
- Combo system (`src/domain/combo.ts`)
- Action definitions (`src/domain/actions.ts`)
- Battle strategies (`src/domain/strategies.ts`)

### BugMon Roster
- 34 BugMon across 7 types (frontend, backend, devops, testing, architecture, security, ai)
- 76 moves
- 7x7 type effectiveness chart
- 7 evolution chains with 10 evolved forms
- Rarity system (common, uncommon, legendary, evolved)
- Error pattern matching for species selection

### Governance Runtime (AgentGuard)
- Action Authorization Boundary (`src/agentguard/core/aab.ts`)
- Runtime Assurance Engine (`src/agentguard/core/engine.ts`)
- Policy evaluator (`src/agentguard/policies/evaluator.ts`)
- Policy loader (`src/agentguard/policies/loader.ts`)
- Invariant checker (`src/agentguard/invariants/checker.ts`)
- Invariant definitions (`src/agentguard/invariants/definitions.ts`)
- Evidence pack generation (`src/agentguard/evidence/pack.ts`)
- Closed-loop governance monitor (`src/agentguard/monitor.ts`)
- Policy configuration (`policy/action_rules.json`, `policy/capabilities.json`)

### CLI (Commander-based)
- 20 subcommands: watch, scan, demo, simulate, resolve, replay, trace, status, score, run-summary, auto-walk, boss-battle, catch, encounter, init, claude-hook, claude-init, contribute, adapter, demo-runner
- Terminal renderer with ANSI colors (`src/cli/renderer.ts`)
- WebSocket sync server (`src/cli/sync-server.ts`)
- Session persistence (`src/cli/session-store.ts`)
- Event source adapters: watch, scan, claude-hook (`src/core/sources/`)

### Browser Game (Idle Dungeon Runner)
- Idle auto-dungeon runner as primary game mode (`src/game/dungeon/runner.ts`)
- Procedural floor generation with rooms, corridors, and loot (`src/game/dungeon/dungeon.ts`)
- Premium dark design system with OLED palette and gold accents (`src/game/theme.ts`)
- Glassmorphic HUD with floor progress, HP, gold counter, event log
- Dev character with hoodie + laptop sprite and running animation
- Parallax scrolling dungeon renderer (`src/game/dungeon/dungeon-renderer.ts`)
- Gold and loot persistence via localStorage (`src/game/dungeon/loot.ts`)
- Auto-resolve minor enemies inline, manual boss fights
- Classic exploration mode (tile-based dungeon, random encounters)
- Canvas 2D rendering with procedural tile textures
- Battle visual effects (`src/game/engine/effects.ts`)
- Synthesized audio (Web Audio API, no audio files)
- Mobile touch controls
- Save/load with auto-save
- CLI-to-browser sync via WebSocket

### Progression
- Bug Grimoire collection tracking (`src/meta/bugdex.ts`)
- Dev-activity evolution system with git hook tracking (`src/game/evolution/`)
- XP and leveling
- Boss encounter system with threshold triggers (`src/meta/bosses.ts`)
- Gold economy (dungeon loot, boosts)

### Multi-Agent Pipeline
- Pipeline orchestrator (`src/orchestration/orchestrator.ts`)
- Stage definitions (`src/orchestration/stages.ts`)
- Agent role definitions (`src/orchestration/roles.ts`)

### Infrastructure
- 134 TypeScript source files (single source of truth)
- 93 test files (77 JS + 16 TS) covering all modules
- Size budget enforcement (10 KB target, 17 KB cap gzipped)
- CI workflows (deploy, validate, size check, CodeQL, publish, release)
- Community submission workflow with automated validation
- Zero browser runtime dependencies; CLI uses `chokidar`, `commander`, `pino`
- Module contract registry (`src/domain/contracts.ts`)
- Runtime shape validation (`src/domain/shapes.ts`)

## What Is Next

### Phase 6 — Plugin Ecosystem (Current)
- Content pack loading system (community enemies, moves, bosses)
- Renderer plugin interface
- Policy pack loading system
- Replay processor interface
- Plugin validation and sandboxing

### Phase 7 — Terminal Roguelike MVP
- Bring the dungeon runner experience to the terminal
- Idle mode with ANSI output
- Active mode for bosses and elites

### Phase 8 — Editor Integrations
- VS Code extension (sidebar webview)
- JetBrains plugin
- Claude Code deep integration

## Resolved Questions

1. **Event persistence format** — NDJSON files in `runtime/events/`
2. **Policy definition language** — JSON (`policy/*.json`)
3. **TypeScript migration** — Complete. `src/` is the single source of truth, compiled to `dist/`
4. **Game mode** — Idle dungeon runner as primary mode, with exploration as secondary

## Open Questions

1. **Content pack format** — how to package and distribute community content packs
2. **Plugin sandboxing** — how to safely load third-party plugins
3. **Terminal dungeon renderer** — how to replicate the visual dungeon experience in ANSI
