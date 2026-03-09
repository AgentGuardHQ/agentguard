# Unified Architecture — AgentGuard + BugMon

This document describes how AgentGuard and BugMon connect through the canonical event model to form a single coherent system.

## Architectural Thesis

The system has one architectural spine: the **canonical event model**.

All system activity becomes events. Events feed two systems:
- **AgentGuard** enforces deterministic execution constraints on AI coding agents.
- **BugMon** visualizes events through a roguelike gameplay loop.

Neither system exists in isolation. AgentGuard produces governance events. BugMon consumes all events — developer signals and governance violations alike — and turns them into interactive encounters.

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
         │                                                     │
         │  source → parse → normalize → classify → dedupe     │
         │                                                     │
         │  Implementation: src/domain/ingestion/               │
         └──────────────────────┬──────────────────────────────┘
                                │
                                ▼
                   ┌────────────────────────┐
                   │  Canonical Event Model  │
                   │                        │
                   │  { id, fingerprint,    │
                   │    type, severity,     │
                   │    source, file,       │
                   │    metadata,           │
                   │    timestamp,          │
                   │    resolved }          │
                   └───────────┬────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │ AgentGuard   │  │ Event Store  │  │  EventBus   │
    │              │  │              │  │             │
    │ Policy eval  │  │ Persistence  │  │ Pub/sub     │
    │ Invariants   │  │ Replay       │  │ Broadcast   │
    │ AAB          │  │ History      │  │             │
    └──────┬───────┘  └──────────────┘  └──────┬──────┘
           │                                    │
           │ governance events                  │ all events
           │                                    │
           ▼                                    ▼
    ┌──────────────────────────────────────────────────────┐
    │                    Subscribers                        │
    │                                                      │
    │  BugMon Terminal    BugMon Browser    Bug Grimoire          │
    │  Renderer           Renderer          Collector       │
    │                                                      │
    │  Stats Engine       Replay Engine     Editor          │
    │                                       Integration     │
    └──────────────────────────────────────────────────────┘
```

## Data Flow

### Flow 1: Developer Error → BugMon Encounter

```
Developer writes code with a bug
    → Test runner outputs TypeError to stderr
    → CLI watch adapter captures stderr
    → Pipeline: parse → normalize → classify → dedupe
    → Canonical event created (type: TypeError, severity: 2)
    → Event persisted to store
    → EventBus emits ERROR_OBSERVED
    → BugMon encounter generator creates NullPointer enemy
    → Terminal renderer shows encounter
    → Developer fixes bug
    → Event marked resolved
    → BugMon records victory in Grimoire, awards XP
```

### Flow 2: Agent Violation → Governance Boss

```
AI agent attempts to modify production config
    → AgentGuard AAB intercepts action
    → Scope resolver: file outside authorized scope
    → Policy evaluator: DENY
    → Invariant checker: production-scope-guard violated
    → Evidence pack generated
    → Canonical event created (type: InvariantViolation, severity: 5)
    → Event persisted to store
    → EventBus emits INVARIANT_VIOLATION
    → BugMon encounter generator creates elite governance boss
    → Terminal renderer shows boss encounter
    → Agent adjusts behavior
    → Event remains in audit trail
```

### Flow 3: CI Failure → Boss Escalation

```
CI pipeline fails on push
    → CI webhook delivers failure event
    → Pipeline: parse CI output → classify → dedupe
    → Canonical event created (type: CIFailure, severity: 4)
    → Boss trigger system checks threshold (ecosystem/bosses.js)
    → CI Dragon boss spawned
    → Event persisted to store
    → EventBus emits BOSS_TRIGGERED
    → BugMon shows boss encounter with elevated difficulty
    → Developer fixes pipeline
    → Event marked resolved
    → Boss defeated, large XP reward
```

## Layer Responsibilities

### AgentGuard Layer

AgentGuard is the **governance producer**. It does not render UI, track progression, or manage game state.

| Responsibility | Description |
|---------------|-------------|
| Action interception | Intercept agent actions before execution |
| Policy evaluation | Evaluate actions against declared policies |
| Invariant monitoring | Verify system invariants hold |
| Blast radius computation | Assess scope of impact |
| Evidence generation | Record evaluation details for audit |
| Event emission | Produce governance events into the canonical model |

See [AgentGuard specification](agentguard.md).

### BugMon Layer

BugMon is the **event consumer and interaction layer**. It does not evaluate policies, authorize actions, or enforce constraints.

| Responsibility | Description |
|---------------|-------------|
| Event consumption | Subscribe to all canonical events |
| Encounter generation | Map events to BugMon creatures |
| Battle engine | Turn-based combat system |
| Run management | Session-scoped roguelike run lifecycle |
| Progression tracking | XP, levels, Bug Grimoire, achievements |
| Rendering | Terminal, browser, and mobile UIs |
| Replay | Reconstruct past sessions from event streams |

See [Roguelike Design](roguelike-design.md).

### Shared Layer

The shared layer provides the canonical event model and infrastructure used by both systems.

| Component | Description | Path |
|-----------|-------------|------|
| Event schema | Canonical event structure | `src/domain/events.ts` |
| EventBus | Universal pub/sub | `src/core/event-bus.ts`, `src/domain/event-bus.ts` |
| Fingerprinting | Stable event deduplication | `src/domain/ingestion/fingerprint.ts` |
| Pipeline | Event normalization | `src/domain/ingestion/pipeline.ts` |
| Event store | Event persistence | `src/domain/event-store.ts` |
| Execution log | Causal chain tracking | `src/domain/execution/` |

## Current Implementation Mapping

The codebase maps to the unified architecture as follows:

| Unified Layer | Current Directory | Description |
|--------------|-------------------|-------------|
| Shared / Events | `src/domain/` | Pure domain logic, event bus, ingestion pipeline |
| Shared / Core | `src/core/` | EventBus, error parsing, matching |
| BugMon / Battle Engine | `src/game/battle/` + `src/domain/battle.ts` | Battle system |
| BugMon / Dungeon Runner | `src/game/dungeon/` | Idle auto-dungeon (primary game mode) |
| BugMon / Design System | `src/game/theme.ts` | Premium dark aesthetic, tokens |
| BugMon / Terminal Renderer | `src/cli/renderer.ts` | ANSI terminal UI |
| BugMon / Browser Renderer | `src/game/` (engine, world, sprites, audio) | Canvas 2D browser game |
| BugMon / Grimoire | `src/meta/bugdex.ts` | Enemy compendium tracking |
| BugMon / Stats | `src/game/evolution/tracker.ts` | Dev activity tracking |
| Shared / Data | `ecosystem/data/` | Game content (JSON + JS modules) |
| AgentGuard / Governance | `src/agentguard/` | AAB, policies, invariants, evidence |
| AgentGuard / Action Interception | `src/core/sources/claude-hook-source.ts` | Claude Code hook |
| BugMon / Boss System | `src/meta/bosses.ts` | Boss trigger definitions |
| Orchestration | `src/orchestration/` | Multi-agent pipeline |

## Target Directory Structure

```
agentguard/                    ← Governance runtime
├── core/                      Runtime engine (AAB, evaluation loop)
├── policies/                  Policy definitions and evaluation
├── invariants/                Invariant definitions and monitoring
├── evidence/                  Evidence pack generation and storage
└── cli/                       CLI governance commands

bugmon/                        ← Roguelike game layer
├── core/                      Run engine, encounter generation
├── battle-engine/             Turn-based combat (from domain/battle.js)
├── grimoire/                  Enemy compendium and progression
├── stats/                     Statistics and meta-progression
└── renderers/
    ├── terminal/              ANSI terminal renderer (from core/cli/)
    ├── browser/               Canvas 2D game (from game/)
    └── mobile/                Mobile-optimized renderer

shared/                        ← Canonical event model
├── events/                    Event schema and definitions
├── schemas/                   Data format schemas
├── fingerprints/              Deduplication logic
└── replay/                    Event stream replay engine
```

This restructuring is a future target. The current layered architecture (`core/`, `game/`, `ecosystem/`, `domain/`) continues to function and is not moved in this phase.

## Integration Guarantees

1. **Single event schema.** AgentGuard and BugMon both produce and consume events conforming to the same canonical schema. No translation layer needed.

2. **Unidirectional governance flow.** AgentGuard produces governance events. BugMon consumes them. BugMon never influences governance decisions.

3. **Independent operation.** BugMon works without AgentGuard (developer signal events only). AgentGuard works without BugMon (governance enforcement only, no game layer). Together, they form the complete system.

4. **Shared event store.** Both systems write to and read from the same event store. This enables cross-cutting queries (e.g., "show all events from this session, both developer errors and governance violations").

5. **Zero coupling between renderers.** Terminal, browser, and mobile renderers are independent subscribers. Adding a new renderer requires no changes to AgentGuard, the event model, or other renderers.
