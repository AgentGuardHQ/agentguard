# System Spec — AgentGuard + BugMon

## Purpose

AgentGuard + BugMon is a unified platform where developer errors become gameplay. AgentGuard provides deterministic governance for AI coding agents. BugMon renders all system events as a roguelike game.

## Architectural Spine

The **canonical event model** is the single integration point. Every system activity produces or consumes events. There are no other integration mechanisms.

## System Boundaries

### AgentGuard (Governance Runtime)
- **Input**: Agent actions (file edits, shell commands, API calls)
- **Output**: Canonical governance events (`PolicyDenied`, `InvariantViolation`, `BlastRadiusExceeded`)
- **Constraint**: Deterministic evaluation — same action + same policy = same result

### BugMon (Roguelike Game)
- **Input**: Canonical events (developer signals, governance violations, CI results)
- **Output**: Interactive encounters, Bug Grimoire entries, session scores
- **Constraint**: Hybrid idle/active — minor enemies auto-resolve, bosses demand engagement

### Domain Layer (Pure Logic)
- **Input**: Events, game data, injected RNG
- **Output**: Battle results, encounter triggers, progression checks
- **Constraint**: No DOM, no Node.js-specific APIs, deterministic when RNG is injected

## Invariants

1. All system activity flows through the canonical event model
2. Domain logic has zero environment dependencies
3. Zero runtime dependencies — dev dependencies only
4. Browser game is 100% client-side
5. All audio is synthesized at runtime (no audio files)
6. Size budget: 10 KB target / 17 KB cap (gzipped main bundle)

## Event Taxonomy

| Category | Examples | Producer | Consumer |
|----------|----------|----------|----------|
| Ingestion | `ErrorObserved`, `BugClassified` | Error watchers | Battle engine |
| Battle | `ENCOUNTER_STARTED`, `MOVE_USED`, `DAMAGE_DEALT` | Battle engine | UI renderers |
| Progression | `ActivityRecorded`, `EvolutionTriggered` | Dev activity tracker | Progression engine |
| Session | `RunStarted`, `RunEnded`, `CheckpointReached` | Run engine | Scoring, save system |
| Governance | `PolicyDenied`, `UnauthorizedAction`, `InvariantViolation` | AgentGuard | Boss encounters |
| Developer Signals | `FileSaved`, `TestCompleted`, `CommitCreated` | Git hooks, watchers | Encounter triggers |

## Technology Constraints

- Vanilla JavaScript (ES6 modules), HTML5 Canvas 2D, Web Audio API
- Build: esbuild + terser (dev dependencies only)
- Deployed to GitHub Pages
- ESLint + Prettier enforced
