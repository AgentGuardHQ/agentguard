# Architecture Specification

## Layered Model

```
┌─────────────────────────────────────────┐
│ src/cli/    (Node.js only)             │
│   CLI companion, commands, renderer    │
└────────────────┬────────────────────────┘
                 │ imports ↓
┌────────────────┴────────────────────────┐
│ src/agentguard/  (Governance runtime)  │
│   AAB, policies, invariants, evidence  │
└────────────────┬────────────────────────┘
                 │ imports ↓
┌────────────────┴────────────────────────┐
│ src/domain/  (Environment-agnostic)    │
│   Pure logic: events, battle, encounters│
│   ingestion pipeline, evolution engine │
└────────────────┬────────────────────────┘
                 │ imports ↓
┌────────────────┴────────────────────────┐
│ src/core/  (Shared logic)              │
│   EventBus, error parsing, matching    │
└────────────────┬────────────────────────┘
                 │ imports ↓
┌────────────────┴────────────────────────┐
│ src/game/    (Browser only)            │
│   Dungeon runner, battle, exploration  │
│   Canvas rendering, audio, sprites     │
└─────────────────────────────────────────┘
```

### Additional Layers

```
src/meta/           Metadata systems (bugdex, bosses)
src/orchestration/  Multi-agent pipeline orchestration
src/protocol/       Sync protocol definitions
src/content/        Game content validation
src/watchers/       Environment watchers (console, test, build)
src/ai/             AI integration interface
```

## Dependency Rules

- **src/domain/** has zero external dependencies. No DOM APIs, no Node.js-specific APIs.
- **src/core/** depends on domain/. Never imports from game/ or cli/.
- **src/cli/** depends on domain/, core/, and meta/. Never imports from game/.
- **src/game/** depends on domain/, core/, and meta/. Never imports from cli/.
- **src/agentguard/** depends on domain/ only. Never imports from cli/ or game/.
- **src/meta/** depends on domain/ and ecosystem/data/. Never imports from cli/ or game/.
- **ecosystem/data/** has zero dependencies. Pure data.

## Key Subsystems

### Ingestion Pipeline (`src/domain/ingestion/`)

Multi-stage pipeline converting raw errors into game entities:

1. **Parse** — Regex matching against 40+ error patterns across 6+ languages
2. **Fingerprint** — Stable hash for deduplication (same error = same fingerprint)
3. **Classify** — Map error type to severity (1-5 scale) and BugEvent
4. **Create Event** — Wrap in canonical event envelope with ID + fingerprint
5. **Map to Species** — BugEvent → BugMon monster species
6. **Map Invariants** — Invariant violations → governance events

### Battle Engine (`src/domain/battle.ts`)

Pure, deterministic combat with injected RNG. Supports passive abilities, healing, combo system, and type effectiveness.

### Event System (`src/domain/events.ts`, `src/core/event-bus.ts`)

Canonical event kinds: `ERROR_OBSERVED`, `MOVE_USED`, `EVOLUTION_TRIGGERED`, governance events, developer signal events, session events. EventBus provides typed pub/sub that works in both Node.js and browser.

### Governance Runtime (`src/agentguard/`)

Action Authorization Boundary (AAB) evaluates agent actions against declared policies. Invariant checker monitors system constraints. Evidence packs provide full audit trails.

### Idle Dungeon Runner (`src/game/dungeon/`)

Auto-run through procedural floors. Dev character moves automatically, defeating minor enemies inline and pausing for boss fights. Gold and loot persist across runs.

### Design System (`src/game/theme.ts`)

Premium dark aesthetic with OLED palette, gold accents, glassmorphic panels, and DM Sans typography. Provides all color tokens, spacing constants, and animation timing.

### Game State Machine (`src/game/engine/state.ts`)

States: `TITLE → EXPLORE → BATTLE_TRANSITION → BATTLE → EVOLVING → MENU → DUNGEON_RUNNER`

## Data Flow

```
External Source → Ingestion Pipeline → Canonical Event → EventBus
                                                           ├→ Game (spawn enemy / dungeon encounter)
                                                           ├→ AgentGuard (check policy)
                                                           └→ Event Store (persist)
```

## Build System

TypeScript source compiles via `tsc` (individual modules for tests/imports) + `esbuild` (bundles for CLI and browser game). Browser loads `dist/game/game.js` as a module.

## Size Budget

- Main bundle: 10 KB target / 17 KB cap (gzipped, no sprites)
- Subsystem caps enforced per module group
