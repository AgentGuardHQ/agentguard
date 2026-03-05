# BugMon Architecture

## Overview

BugMon is a Pokémon-style browser game themed around software bugs. It runs entirely client-side with vanilla JS, HTML Canvas, and zero dependencies. Serve it with any static file server and open `index.html`.

```
python3 -m http.server
# open http://localhost:8000
```

## Project Structure

```
BugMon/
├── index.html              Entry point - canvas element, loads game.js
├── game.js                 Game loop, data loading, orchestration
│
├── engine/                 Core engine (framework-level)
│   ├── state.js            Game state machine: EXPLORE | BATTLE | MENU
│   ├── input.js            Keyboard input tracking (pressed/just-pressed)
│   └── renderer.js         All Canvas drawing functions
│
├── world/                  Overworld systems
│   ├── map.js              Map data loading, tile queries, collision
│   ├── player.js           Player position, movement, party
│   └── encounters.js       Wild encounter checks (10% in tall grass)
│
├── battle/                 Battle systems
│   ├── battleEngine.js     Turn-based battle state machine
│   └── damage.js           Damage formula
│
├── data/                   Game content (JSON, data-driven)
│   ├── monsters.json       BugMon creatures and stats
│   ├── moves.json          Move definitions
│   └── map.json            Tile grid for the world map
│
└── sprites/                Pixel art sprites (Canvas-generated)
    └── sprites.js          Sprite drawing functions for each BugMon
```

## Module Dependency Graph

```
game.js (entry point)
├── engine/state.js         (no deps)
├── engine/input.js         (no deps)
├── engine/renderer.js      (no deps)
├── world/map.js            (no deps)
├── world/player.js         ← engine/input.js, world/map.js
├── world/encounters.js     (no deps, receives data via setter)
├── battle/damage.js        (no deps)
└── battle/battleEngine.js  ← battle/damage.js, engine/input.js,
                               engine/state.js, world/player.js
```

All modules use ES Module `import`/`export`. JSON data is loaded via `fetch()` at startup in `game.js` and passed to modules through setter functions.

## Game State Machine

```
┌─────────┐  encounter   ┌─────────┐
│ EXPLORE │─────────────>│ BATTLE  │
│         │<─────────────│         │
└─────────┘  win/run/    └─────────┘
     │       capture
     │
     │ Esc (future)
     v
┌─────────┐
│  MENU   │
└─────────┘
```

### EXPLORE State
- Player moves on a tile grid (arrow keys)
- 150ms cooldown between moves
- Walking on grass (tile 2) has 10% encounter chance

### BATTLE State
Battle has its own sub-states:

```
┌──────┐  pick move   ┌───────┐
│ menu │──────────────>│ fight │
│      │<──── Esc ─────│       │
└──┬───┘               └───┬───┘
   │                       │
   │ capture/run     Enter │
   │                       v
   └──────────────>┌─────────┐  timer  ┌──────────┐
                   │ message │────────>│ next     │
                   └─────────┘         │ action   │
                                       └──────────┘
```

- **menu**: Choose Fight / Capture / Run
- **fight**: Pick a move from your BugMon's moveset
- **message**: Display result text for 1.5s, then execute next action

### Turn Resolution
1. Compare speeds - faster BugMon goes first (ties: player)
2. Apply damage: `power + attack - floor(defense/2) + random(1-3)` (min 1)
3. Check KO after each attack
4. If both alive, return to menu

### Capture Formula
```
chance = (1 - enemyHP/maxHP) * 0.5 + 0.1
```
At full HP: 10% chance. At 1 HP: ~60% chance. Failed capture = enemy gets a free turn.

## Data Formats

### monsters.json
```json
{
  "id": 1,
  "name": "NullPointer",
  "hp": 30, "attack": 8, "defense": 4, "speed": 6,
  "moves": ["segfault", "hotfix"],
  "color": "#e74c3c",
  "sprite": "nullpointer"
}
```

### moves.json
```json
{ "id": "segfault", "name": "SegFault", "power": 10 }
```

### map.json
Tile values: `0` = ground, `1` = wall, `2` = tall grass
```json
{ "width": 15, "height": 10, "tiles": [[1,1,...], ...] }
```

## Rendering

- Canvas: 480x320 (15×10 tiles at 32px)
- Tiles: colored rectangles (tan ground, gray walls, green grass with crosshatch)
- Player: blue square with directional triangle
- Battle: split screen with HP bars and text menu
- BugMon sprites: pixel art drawn programmatically on canvas (see `sprites/sprites.js`)

## Key Design Decisions

- **ES Modules** over script tags: proper scoping, explicit dependencies
- **Setter functions** for data injection: modules like `encounters.js` receive monster data via `setMonstersData()` rather than importing JSON directly (fetch requires async)
- **Single mutable state**: no framework, no event bus. Modules read/write shared state directly. Works at this scale.
- **Grid-locked movement**: player position is always integer tile coords. No sub-tile animation in V1.
- **Message queue pattern**: battle uses `showMessage(text, callback)` to chain actions with visible pauses between them
