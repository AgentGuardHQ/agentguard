# AgentGuard / BugMon TypeScript System

TypeScript source — the single source of truth for the AgentGuard platform.

## Architecture

The system follows a layered architecture with strict dependency rules. All modules communicate through typed event buses and pure domain logic.

```
┌─────────────┐     ┌───────────┐     ┌──────────────┐     ┌─────────────────┐
│   Sources    │────▶│ Ingestion │────▶│ Canonical    │────▶│ Subscribers     │
│ (detection)  │     │ Pipeline  │     │ Event Model  │     │ (renderers)     │
└─────────────┘     └───────────┘     └──────────────┘     └─────────────────┘
  stderr              parse             EventBus            Dungeon Runner
  test output         fingerprint       Event Store         Terminal Renderer
  agent actions       classify          AgentGuard          Bug Grimoire
  CI systems          dedupe                                Stats Engine
```

## Layers

| Layer | Path | Purpose |
|-------|------|---------|
| **CLI** | `src/cli/` | Commander-based CLI (20 subcommands). Node.js only. |
| **Game** | `src/game/` | Browser roguelike with idle dungeon runner. Zero deps. |
| **Dungeon** | `src/game/dungeon/` | Idle auto-dungeon runner (primary game mode) |
| **Theme** | `src/game/theme.ts` | Design system (OLED palette, gold, glassmorphism) |
| **AgentGuard** | `src/agentguard/` | Governance runtime (AAB, policies, invariants) |
| **Domain** | `src/domain/` | Pure domain logic (battle, events, ingestion). No DOM/Node APIs. |
| **Core** | `src/core/` | Shared logic (EventBus, error parsing, matching) |
| **Meta** | `src/meta/` | Metadata (bugdex compendium, boss definitions) |
| **Orchestration** | `src/orchestration/` | Multi-agent pipeline orchestration |
| **Protocol** | `src/protocol/` | Sync protocol definitions |
| **Content** | `src/content/` | Game content validation |
| **Watchers** | `src/watchers/` | Environment watchers (console, test, build) |
| **AI** | `src/ai/` | AI integration interface |

## Key Modules

| Module | Path | Purpose |
|--------|------|---------|
| **EventBus** | `src/core/event-bus.ts` | Strongly typed pub/sub backbone |
| **ErrorParser** | `src/core/error-parser.ts` | 40+ error patterns across 6+ languages |
| **Matcher** | `src/core/matcher.ts` | Error → BugMon enemy matching |
| **Battle** | `src/domain/battle.ts` | Pure deterministic battle engine |
| **Events** | `src/domain/events.ts` | Canonical event definitions |
| **Ingestion** | `src/domain/ingestion/` | Error normalization pipeline |
| **Runner** | `src/game/dungeon/runner.ts` | Idle dungeon runner logic |
| **DungeonGen** | `src/game/dungeon/dungeon.ts` | Procedural floor generation |
| **Theme** | `src/game/theme.ts` | Design system tokens |
| **AAB** | `src/agentguard/core/aab.ts` | Action Authorization Boundary |
| **CLI** | `src/cli/bin.ts` | CLI entry point |

## Getting Started

```bash
# Build TypeScript
npm run build:ts

# Type check
npm run ts:check

# Run TypeScript tests
npm run ts:test

# Start dev server
npm run serve
# Open http://localhost:8000

# Run CLI
npm run dev
```

## Design Principles

- **Deterministic**: All core logic is pure and deterministic (RNG injected)
- **Layered**: Strict dependency rules — no cross-imports between cli/ and game/
- **Zero browser deps**: Browser game has no runtime dependencies
- **Strong typing**: Full TypeScript strict mode, discriminated unions for events
- **Data-driven**: Game content in JSON, engine reads data, never hardcodes
- **Event-driven**: Canonical event model connects all subsystems
