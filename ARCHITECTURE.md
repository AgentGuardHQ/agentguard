# Architecture

## Architectural Thesis

The system has a single architectural spine: the **canonical event model**.

All system activity — developer tooling failures, runtime errors, CI failures, agent actions, governance violations — is normalized into events. These events feed two systems:

- **AgentGuard** enforces deterministic execution constraints on AI coding agents
- **BugMon** visualizes events through a roguelike gameplay loop with hybrid idle/active encounters

Neither system exists in isolation. AgentGuard produces governance events. BugMon consumes all events and renders them as gameplay. The canonical event model is the contract between them.

For the full integration model, see [docs/unified-architecture.md](docs/unified-architecture.md). For the formal architecture brief with academic foundations, see [docs/agent-sdlc-architecture.md](docs/agent-sdlc-architecture.md).

## System Model

```
┌──────────────────────────────────────────────────────────────────┐
│                        Event Sources                             │
│                                                                  │
│  Developer Signals          Agent Actions        CI Systems      │
│  ├── stderr                 ├── file_write       ├── pipeline    │
│  ├── test output            ├── git_commit       ├── build       │
│  ├── linter output          ├── git_push         └── deploy      │
│  └── runtime crashes        └── config_change                    │
└──────────────────┬───────────────────┬───────────────┬───────────┘
                   │                   │               │
                   ▼                   ▼               ▼
         ┌─────────────────────────────────────────────────────┐
         │              Event Normalization Pipeline            │
         │  source → parse → normalize → classify → dedupe     │
         │  Implementation: src/domain/ingestion/              │
         └──────────────────────┬──────────────────────────────┘
                                │
                   ┌────────────────────────┐
                   │  Canonical Event Model  │
                   │  { id, fingerprint,    │
                   │    type, severity,     │
                   │    source, file,       │
                   │    metadata, timestamp,│
                   │    resolved }          │
                   └───────────┬────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │ AgentGuard   │  │ Event Store  │  │  EventBus   │
    │ policies     │  │ persistence  │  │ pub/sub     │
    │ invariants   │  │ replay       │  │ broadcast   │
    │ evidence     │  │              │  │             │
    └──────┬───────┘  └──────────────┘  └──────┬──────┘
           │ governance events                  │ all events
           └────────────┬───────────────────────┘
                        ▼
              ┌──────────────────────┐
              │    Subscribers       │
              │  Terminal renderer   │
              │  Browser renderer    │
              │  Dungeon runner      │
              │  Bug Grimoire        │
              │  Stats engine        │
              │  Replay engine       │
              └──────────────────────┘
```

## Project Structure

TypeScript in `src/` is the **single source of truth**. It compiles to `dist/` via `tsc` (individual modules) + `esbuild` (CLI and game bundles).

```
AgentGuard/
├── index.html              # Entry point (canvas, inline CSS, touch controls)
├── package.json            # npm scripts, deps, build config
│
├── src/                    # TypeScript source (single source of truth)
│   ├── agentguard/         # Governance runtime (deterministic RTA)
│   │   ├── core/           # AAB + RTA engine
│   │   ├── policies/       # Policy evaluation + loading
│   │   ├── invariants/     # Invariant checking + definitions
│   │   ├── evidence/       # Evidence pack generation
│   │   └── monitor.ts      # Closed-loop governance monitor
│   ├── cli/                # CLI interface (agentguard command)
│   │   ├── bin.ts          # Entry point (agentguard + bugmon binaries)
│   │   ├── index.ts        # CLI exports
│   │   └── commands/       # 20 subcommands (watch, scan, play, etc.)
│   ├── core/               # Shared logic (EventBus, parsing, matching)
│   │   ├── event-bus.ts    # Universal typed EventBus
│   │   ├── error-parser.ts # Error message parser (40+ patterns)
│   │   ├── matcher.ts      # Error → BugMon enemy matching
│   │   ├── types.ts        # Shared type definitions
│   │   └── sources/        # Event source adapters (watch, scan, claude-hook)
│   ├── domain/             # Pure domain logic (no DOM, no Node.js APIs)
│   │   ├── battle.ts       # Pure battle engine (deterministic with injected RNG)
│   │   ├── encounters.ts   # Encounter logic with rarity weights
│   │   ├── evolution.ts    # Progression condition checking
│   │   ├── events.ts       # Canonical domain event definitions
│   │   ├── dev-event.ts    # Developer signal event types
│   │   ├── event-bus.ts    # Domain event bus
│   │   ├── event-store.ts  # Event persistence interface
│   │   ├── ingestion/      # Error normalization pipeline (8 files)
│   │   ├── execution/      # Execution adapters
│   │   ├── invariants.ts   # Governance invariant definitions
│   │   ├── policy.ts       # Policy evaluation logic
│   │   ├── reference-monitor.ts  # Governance reference monitor
│   │   ├── contracts.ts    # Module contract registry
│   │   ├── shapes.ts       # Runtime shape definitions
│   │   └── ...             # rng, hash, correlation, projections, etc.
│   ├── game/               # BugMon browser game (client-side, zero deps)
│   │   ├── game.ts         # Game entry point (auto-init, data loading)
│   │   ├── theme.ts        # Design system (OLED palette, gold accents, glassmorphism)
│   │   ├── engine/         # Core framework (state, input, renderer, events, effects)
│   │   ├── dungeon/        # Idle dungeon runner (primary game mode)
│   │   │   ├── runner.ts   # Auto-run logic, phase machine, encounter resolution
│   │   │   ├── dungeon.ts  # Procedural floor generation (rooms, corridors, loot)
│   │   │   ├── loot.ts     # Gold, boosts, run persistence (localStorage)
│   │   │   └── dungeon-renderer.ts  # Premium renderer (parallax, glassmorphic HUD)
│   │   ├── battle/         # Turn-based battle engine
│   │   ├── world/          # Map, player, encounters (exploration mode)
│   │   ├── evolution/      # Dev-activity progression (tracker, animation)
│   │   ├── audio/          # Sound synthesis (Web Audio API)
│   │   ├── sync/           # Save/sync (localStorage, WebSocket)
│   │   └── sprites/        # Pixel art (procedural gen + PNG sprites)
│   ├── meta/               # Metadata systems (bugdex, bosses)
│   ├── orchestration/      # Multi-agent pipeline orchestration
│   ├── protocol/           # Sync protocol definitions
│   ├── content/            # Game content validation (bugdex-spec)
│   ├── watchers/           # Environment watchers (console, test, build)
│   └── ai/                 # AI integration interface
│
├── dist/                   # Compiled output (tsc + esbuild)
│   ├── cli/                # Bundled CLI (esbuild)
│   ├── game/               # Bundled game + sprites (esbuild)
│   ├── core/               # Individual modules (tsc)
│   ├── domain/             # Individual modules (tsc)
│   ├── agentguard/         # Individual modules (tsc)
│   └── ecosystem/          # Individual modules (tsc)
│
├── ecosystem/data/         # Game content (JSON source + inlined JS modules)
│   ├── monsters.json       # 34 BugMon enemy definitions
│   ├── moves.json          # 76 move definitions
│   ├── types.json          # 7 types + effectiveness chart
│   ├── evolutions.json     # Progression chains
│   ├── map.json            # 15x10 tile grid
│   └── *.js                # Inlined JS modules (generated by sync-data)
│
├── policy/                 # Policy configuration (JSON)
│   ├── action_rules.json   # Agent action validation rules
│   └── capabilities.json   # Agent capability boundaries
│
├── simulation/             # Headless battle simulation
│   ├── cli.js              # CLI entry (--battles, --compare flags)
│   ├── simulator.js        # Round-robin matchup orchestrator
│   ├── headlessBattle.js   # Headless battle runner
│   ├── strategies.js       # AI battle strategies
│   ├── report.js           # Statistical report generation
│   └── rng.js              # Seeded RNG for reproducible sims
│
├── tests/                  # Test suite (77 JS + 16 TS test files)
│   ├── run.js              # Custom test runner (JS tests import from dist/)
│   ├── *.test.js           # JavaScript tests
│   └── ts/                 # TypeScript tests (run via vitest)
│
├── scripts/                # Build tooling
│   ├── build.js            # Single-file builder (esbuild + terser)
│   ├── dev-server.js       # Zero-dep dev server with live reload
│   ├── sync-data.js        # JSON → JS module converter
│   └── check-contracts.js  # Module contract validation
│
├── spec/                   # Artifact-first development specs
├── docs/                   # System documentation
├── hooks/                  # Git hooks for dev activity tracking
└── .github/                # CI/CD workflows and issue templates
```

## Layered Architecture

```
┌─────────────────────────────────────────────────────────┐
│  src/cli/                Commander-based CLI (Node.js)   │
│  ├── commands/*           20 subcommands                 │
│  ├── renderer.ts          Terminal rendering (ANSI)      │
│  └── sync-server.ts       WebSocket sync server          │
├─────────────────────────────────────────────────────────┤
│  src/game/                Browser roguelike (client-side) │
│  ├── dungeon/*            Idle dungeon runner (primary)   │
│  ├── engine/*             State, input, rendering, FX     │
│  ├── battle/*             Turn-based combat engine        │
│  ├── world/*              Tile-based exploration          │
│  ├── evolution/*          Dev-activity progression        │
│  ├── audio/*              Synthesized sound effects       │
│  ├── sync/*               Save/load + CLI sync            │
│  └── sprites/*            Sprite loading + generation     │
├─────────────────────────────────────────────────────────┤
│  src/agentguard/          Governance runtime (RTA)        │
│  ├── core/*               AAB + RTA engine                │
│  ├── policies/*           Policy evaluation + loading     │
│  ├── invariants/*         Invariant checking              │
│  ├── evidence/*           Evidence pack generation        │
│  └── monitor.ts           Closed-loop feedback            │
├─────────────────────────────────────────────────────────┤
│  src/domain/              Pure domain logic (no deps)     │
│  ├── battle.ts            Pure battle engine              │
│  ├── encounters.ts        Encounter logic                 │
│  ├── evolution.ts         Progression engine              │
│  ├── events.ts            Domain event definitions        │
│  ├── event-bus.ts         Universal EventBus              │
│  ├── source-registry.ts   Event source plugin registry    │
│  ├── ingestion/*          Error ingestion pipeline        │
│  └── execution/*          Execution adapters              │
├─────────────────────────────────────────────────────────┤
│  src/core/                Shared logic (CLI + browser)    │
│  ├── event-bus.ts         Typed EventBus                  │
│  ├── error-parser.ts      Error parsing (40+ patterns)    │
│  ├── matcher.ts           Error → enemy matching          │
│  └── sources/*            Event source adapters            │
├─────────────────────────────────────────────────────────┤
│  src/meta/                Metadata (bugdex, bosses)       │
│  src/orchestration/       Multi-agent pipeline            │
│  src/protocol/            Sync protocol definitions       │
│  src/content/             Game content validation         │
│  src/watchers/            Environment watchers            │
├─────────────────────────────────────────────────────────┤
│  ecosystem/data/          Game content (JSON + JS)        │
│  ├── *.json               Source data (monsters, moves)   │
│  └── *.js                 Inlined JS modules              │
└─────────────────────────────────────────────────────────┘
```

**Key separation:**
- **src/cli/** — Node.js CLI (`agentguard` command). Parses errors, matches them to enemies, renders to terminal. Includes event source adapters. Runs in Node.js only.
- **src/game/** — Browser roguelike. Idle dungeon runner, battle engine, exploration, progression, audio, sprites. Runs in the browser only. Zero runtime dependencies.
- **src/agentguard/** — Governance runtime implementing the Runtime Assurance Architecture. Evaluates agent actions against policies and invariants. Produces canonical governance events.
- **src/domain/** — Pure domain logic with no DOM or Node.js-specific APIs. Battle engine, encounter logic, progression engine, event bus, error ingestion pipeline, governance primitives, and source registry. All functions are pure and deterministic (when RNG is injected). Consumed by both cli/ and game/.
- **src/core/** — Shared logic used by both CLI and game. EventBus, error parsing, matching, event source adapters.
- **ecosystem/data/** — Shared game content (JSON data). Consumed by both cli/ and game/.

**Invariant:** `src/cli/` and `src/game/` have no cross-imports. Both consume from `src/domain/`, `src/core/`, and `ecosystem/data/`.

## Idle Dungeon Runner

The browser game's primary mode is an **idle auto-dungeon runner** (`src/game/dungeon/`). The character automatically runs through procedural dungeon floors:

- **Auto-run**: Dev character moves through rooms, corridors, and treasure
- **Minor enemies**: Auto-resolve inline with floating damage numbers
- **Bosses**: Pause for player input (simple turn-based fight)
- **Treasure**: Auto-collects gold, boosts, and power-ups
- **Floors**: Procedurally generated with increasing difficulty
- **Persistence**: Gold, run stats, and boosts persist via localStorage

### Design System

The game uses a premium dark aesthetic (`src/game/theme.ts`):
- **OLED palette**: Deep darks (#050510 → #0A0E27 → #151B38)
- **Gold accents**: Treasure, highlights, premium feel (#F59E0B)
- **Glassmorphic panels**: Semi-transparent HUD elements with subtle borders
- **Cyan/purple action accents**: Combat effects and abilities
- **DM Sans typography**: Clean, modern font
- **Parallax scrolling**: Multi-layer depth in dungeon corridors

### Runner Phases

```
running → encounter (auto-battle) → collecting (treasure) → floor_clear → next floor
                                                              ↓
                                                          boss (manual)
                                                              ↓
                                                          run_over (death stats)
```

## AgentGuard Governance Pipeline

AgentGuard evaluates agent actions through a deterministic pipeline. See [docs/agentguard.md](docs/agentguard.md) for the full specification.

```
Agent Action → AAB → Policy Evaluation → Invariant Check → Blast Radius
    │                                                           │
    ├─ ALLOW → execute action                                   │
    └─ DENY → emit governance event → evidence pack             │
              → BugMon spawns governance boss                   │
```

Governance events conform to the canonical event schema:
- `PolicyDenied` (severity 3)
- `UnauthorizedAction` (severity 4)
- `InvariantViolation` (severity 5)
- `BlastRadiusExceeded` (severity 4)
- `MergeGuardFailure` (severity 4)

## BugMon Roguelike Engine

BugMon implements a roguelike with hybrid idle/active encounters. See [docs/roguelike-design.md](docs/roguelike-design.md) for the full design.

**Run lifecycle:** Session start → event monitoring → encounter generation → idle/active combat → run end

**Idle mode (dungeon runner):** The character auto-runs through procedural floors. Minor enemies (severity 1-2) are defeated inline with floating combat text. The developer watches or codes while the game plays itself.

**Active mode:** Bosses and elites (severity 3+) pause the runner and require player input for turn-based combat.

**Bug Grimoire:** Permanent compendium of defeated enemy types. Records encounter history, error patterns, and fix strategies.

## Event Normalization Pipeline

The pipeline transforms raw signals into canonical events. See [docs/bug-event-pipeline.md](docs/bug-event-pipeline.md) for the full pipeline specification.

```
source → parse → normalize → classify → dedupe → persist → emit
```

Implementation: `src/domain/ingestion/` with supporting modules in `src/core/`.

## Module Dependency Graph

```
src/game/game.ts (entry point, browser)
├── src/game/theme.ts           (design system tokens, no deps)
├── src/game/dungeon/runner.ts  ← theme, dungeon, loot, audio
├── src/game/dungeon/dungeon.ts ← theme (procedural floor gen)
├── src/game/dungeon/loot.ts    (localStorage persistence)
├── src/game/dungeon/dungeon-renderer.ts ← theme, runner state
├── src/game/engine/state.ts    ← engine/events
├── src/game/engine/input.ts    ← audio/sound
├── src/game/engine/game-renderer.ts ← sprites, theme
├── src/game/engine/effects.ts  ← theme (battle visual effects)
├── src/game/battle/battle-engine.ts ← domain/battle, engine, audio
├── src/game/world/map.ts       (no deps)
├── src/game/world/player.ts    ← input, map, audio
├── src/game/world/encounters.ts ← audio
├── src/game/evolution/tracker.ts (localStorage)
├── src/game/audio/sound.ts     (no deps, Web Audio API)
├── src/game/sprites/sprites.ts (no deps, image loader)
├── src/game/sprites/monster-gen.ts (procedural sprite gen)
├── src/game/sprites/tiles.ts   (procedural tile gen)
├── ecosystem/data/monsters.js  (inlined data module)
├── ecosystem/data/moves.js     (inlined data module)
├── ecosystem/data/types.js     (inlined data module)
└── ecosystem/data/evolutions.js (inlined data module)

src/cli/bin.ts (entry point, Node.js CLI)
├── src/core/error-parser.ts    ← error parsing
├── src/core/matcher.ts         ← error → enemy matching
├── src/cli/commands/*          ← CLI subcommands
└── src/domain/*                ← pure domain logic
```

## Game State Machine

```
┌─────────┐  new/continue  ┌─────────┐  encounter  ┌──────────────────┐  done  ┌─────────┐
│  TITLE  │───────────────>│ EXPLORE │────────────>│ BATTLE_TRANSITION │──────>│ BATTLE  │
│         │                │         │<────────────│  (flash + fade)   │       │         │
└─────────┘                └─────────┘  win/run    └──────────────────┘       └─────────┘
     │                          │
     │  dungeon mode            │ progression trigger
     ▼                          ▼
┌──────────┐              ┌──────────┐
│ DUNGEON  │              │ EVOLVING │  (4-phase animation)
│ RUNNER   │              └──────────┘
│ (idle)   │
└──────────┘
```

States: `TITLE`, `EXPLORE`, `BATTLE_TRANSITION`, `BATTLE`, `EVOLVING`, `MENU`, `DUNGEON_RUNNER`

## Battle System

### Turn Resolution
1. Compare speeds — faster combatant goes first (ties: player)
2. Apply damage: `power + attack - floor(defense/2) + random(1-3)` (min 1)
3. Type multiplier: 0.5x (not effective), 1.0x (neutral), 1.5x (super effective)
4. Critical hit: 6.25% chance for 1.5x damage
5. Check KO after each attack
6. If both alive, return to menu

### Passive Abilities
- **RandomFailure** (50% threshold): Defender negates incoming damage
- **NonDeterministic** (25% threshold): Attacker acts twice in same turn

### Boss Encounters

Bosses spawn from systemic failures via threshold triggers:

| Boss | Trigger | Threshold |
|------|---------|-----------|
| Test Suite Hydra | Multiple test failures | 3 in session |
| CI Dragon | Pipeline failure | 1 occurrence |
| Dependency Kraken | npm conflict | 1 occurrence |
| Memory Leak Titan | Heap growth | 1 occurrence |

## Data Formats

All game data lives in `ecosystem/data/`. JSON files are the source of truth; JS modules are generated via `npm run sync-data`.

### monsters.json
```json
{
  "id": 1, "name": "NullPointer", "type": "backend",
  "hp": 30, "attack": 8, "defense": 4, "speed": 6,
  "moves": ["segfault", "unhandledexception", "memoryaccess"],
  "color": "#e74c3c", "sprite": "nullpointer",
  "rarity": "common", "theme": "runtime error",
  "passive": null, "description": "..."
}
```

### moves.json
```json
{ "id": "segfault", "name": "SegFault", "power": 10, "type": "backend" }
```

### types.json
7 types: `frontend`, `backend`, `devops`, `testing`, `architecture`, `security`, `ai`. Effectiveness chart maps attacker → defender → multiplier (0.5x / 1.0x / 1.5x).

### evolutions.json
```json
{
  "id": "callback_chain", "name": "Async Evolution",
  "stages": [{ "monsterId": 2, "name": "CallbackHell" }, ...],
  "triggers": [{ "from": 2, "to": 23,
    "condition": { "event": "commits", "count": 10 },
    "description": "Make 10 commits" }]
}
```

### map.json
Tile values: `0` = ground, `1` = wall, `2` = tall grass (encounter zone)

## Plugin Architecture

The system supports five extension categories. See [docs/plugin-api.md](docs/plugin-api.md).

1. **Event sources** — feed new signal types into the normalization pipeline
2. **Content packs** — community-contributed enemies, moves, and progression chains
3. **Renderers** — terminal, browser, mobile, editor integrations
4. **Policy packs** — AgentGuard governance rule sets
5. **Replay processors** — event stream analysis and transformation

## Build System

```bash
npm run build:ts       # Compile TypeScript (tsc + esbuild → dist/)
npm run build          # Full build with inline sprites
npm run build:tiny     # Build without sprites (smallest)
npm run budget         # Check size budget compliance
```

Pipeline: TypeScript → tsc (individual modules) + esbuild (bundles) → terser (compression) → single HTML file with inlined CSS and JS.

## Size Budget

| Metric | Target | Hard Cap |
|--------|-------:|--------:|
| Bundle (gzipped, no sprites) | 10 KB | 17 KB |
| Bundle (gzipped, with sprites) | ~19 KB | 32 KB |

Subsystem caps (raw bytes): engine (7.5 KB), rendering (15.5 KB), battle (14.5 KB), data (13.2 KB), game-logic (19.5 KB), infrastructure (7 KB).

## Testing

```bash
npm test               # Run JS tests (77 test files, import from dist/)
npm run ts:test        # Run TypeScript tests (16 test files, vitest)
npm run test:coverage  # Run with coverage (c8, 50% threshold)
npm run simulate -- --all --runs 100   # Balance analysis
```

93 test files (77 JS + 16 TS) covering: battle, damage, encounters, evolution, ingestion pipeline, event bus, game loop, input, map, renderer, save, simulation, sprites, sync, governance (AAB, RTA, invariants, monitor), and more.

## Architectural Invariants

1. **Layer boundaries are strict.** `src/cli/` must not import from `src/game/`. `src/game/` must not import from `src/cli/`.
2. **Battle engine must stay pure.** Zero UI, audio, or DOM dependencies in `src/domain/battle.ts`.
3. **JSON is the source of truth.** `.js` data modules are generated artifacts.
4. **Contributed enemies require no code changes.** New BugMon are added entirely through JSON edits.
5. **Zero runtime dependencies in browser game.** No npm packages in shipped browser code. CLI has runtime deps (`chokidar`, `commander`, `pino`).
6. **Deterministic battle engine.** Same inputs + same RNG seed = same outputs.
7. **Universal EventBus.** Works identically in Node.js and browser.
8. **TypeScript is the source of truth.** All source lives in `src/`, compiled to `dist/` via tsc + esbuild.
