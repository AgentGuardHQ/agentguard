# BugMon Sprite Guide

## How Sprites Work

Drop PNG files into this `sprites/` folder. The game loads them automatically based on the `sprite` field in `data/monsters.json`. If a PNG isn't found, the game falls back to colored squares.

## Sprite Specs

### Battle Sprites (BugMon)
- **Size**: 64x64 pixels (will be rendered at 64x64 on a 480x320 canvas)
- **Format**: PNG with transparent background
- **Style**: Pixel art, 16-color palette or less looks great
- **Naming**: must match the `sprite` field in monsters.json (lowercase, no spaces)

| Filename | Monster |
|----------|---------|
| `nullpointer.png` | NullPointer |
| `racecondition.png` | RaceCondition |
| `memoryleak.png` | MemoryLeak |

### Player Sprites
- **Size**: 32x32 pixels (one tile)
- **Format**: PNG with transparent background
- **Files needed**: 4 directional frames

| Filename | Direction |
|----------|-----------|
| `player_down.png` | Facing down (default) |
| `player_up.png` | Facing up |
| `player_left.png` | Facing left |
| `player_right.png` | Facing right |

## Art Descriptions for Nano Banana

Use these descriptions when generating sprites. Ask for **pixel art style, 64x64, transparent background**.

---

### NullPointer
> A ghostly red phantom shaped like a broken arrow. Its body is translucent crimson with hollow white eyes that stare into the void. Where its feet should be, the creature tapers into a jagged pointer arrow that points downward into nothingness. Small glitch artifacts flicker around its edges. It looks lost and confused, perpetually searching for something that doesn't exist.

**Color palette**: #e74c3c (red), #c0392b (dark red), #f1948a (light red), white eyes

---

### RaceCondition
> A frantic orange creature split down the middle into two halves, each trying to run in a different direction. The left half faces left with a panicked expression, the right half faces right looking equally stressed. Lightning-bolt speed lines trail behind it. Its body is angular and sleek like a racing animal. The split down its center glows bright yellow with electrical energy. Small duplicated afterimages blur around it.

**Color palette**: #f39c12 (orange), #e67e22 (dark orange), #f9e79f (yellow highlights)

---

### MemoryLeak
> A bloated green blob creature that looks like it is slowly inflating and cannot stop growing. Its body is a round squishy mass of green slime with half-closed sleepy eyes, exhausted from carrying so much. Bright teal droplets drip constantly from its body and pool beneath it. Small floating 0s and 1s orbit around it like debris. A tiny faucet or pipe sticks out of its head, slowly dripping. It looks heavy, tired, and perpetually expanding.

**Color palette**: #2ecc71 (green), #27ae60 (dark green), #1abc9c (teal drips), #a9dfbf (highlight)

---

### Player Character
> A small pixel art character of a programmer/developer. Blue shirt, dark pants, brown hair. Simple but recognizable human figure. Retro RPG style like early Pokémon games. Needs 4 directional views (front/back/left/right).

**Color palette**: #3498db (blue shirt), #2c3e50 (dark pants), #4a3728 (brown hair), #f5c6a0 (skin)

## Adding New BugMon Sprites

1. Add the monster to `data/monsters.json` with a `sprite` field
2. Write a description in this guide
3. Generate the sprite with Nano Banana
4. Save as `sprites/<sprite-name>.png` (64x64, transparent background)
5. The game picks it up automatically on next load
