# BugMon Roadmap

## V1 - Playable Prototype (DONE)

- [x] Tile-based exploration (15x10 map)
- [x] Arrow key movement with grid snapping
- [x] 3 BugMon: NullPointer, RaceCondition, MemoryLeak
- [x] 5 moves: SegFault, Hotfix, ThreadLock, GarbageCollect, MemoryDump
- [x] Random encounters in tall grass (10% chance)
- [x] Turn-based battle with speed priority
- [x] Capture mechanic (HP-based probability)
- [x] Run option (always succeeds)
- [x] HUD showing active BugMon and party size

## V1.1 - Sprites & Polish (IN PROGRESS)

- [x] Pixel art sprites for all 3 BugMon (canvas-drawn)
- [x] Player character sprite with directional frames
- [ ] Tile sprites (ground texture, wall bricks, animated grass)
- [ ] Battle transition animation (flash/fade)
- [ ] Battle background art
- [ ] Sound effects (Web Audio API, no files needed)

## V2 - More BugMon & Moves

- [ ] Expand to 9+ BugMon:
  - Deadlock, OffByOne, MergeConflict
  - CallbackHell, Heisenbug, InfiniteLoop
  - SpaghettiCode, StackOverflow (creature), IndexOutOfBounds
- [ ] Expand to 15+ moves:
  - PatchDeploy, Refactor, ForceQuit, BlueScreen
  - CoreDump, Rollback, HotReload, TypeMismatch
  - NullCheck, BufferOverrun, Reboot, Compile
- [ ] Type system (memory, logic, runtime, syntax)
- [ ] Type effectiveness chart

## V3 - Status Effects & Depth

- [ ] Status conditions:
  - Bugged (damage over time)
  - Deprecated (reduced attack)
  - Frozen (skip turn chance)
  - Corrupted (random move override)
  - Optimized (speed boost)
- [ ] Moves that inflict status effects
- [ ] Multi-turn moves (Compile: charge then hit hard)
- [ ] Healing moves (Hotfix restores HP instead of dealing damage)

## V4 - World Expansion

- [ ] Multiple maps with transitions
- [ ] Map zones: Server Room, QA Lab, Production Floor, Legacy Basement
- [ ] NPC trainers (other developers)
  - Junior Dev, Senior Dev, DevOps Engineer, QA Tester
- [ ] Dialog system
- [ ] Healing station (the Coffee Machine)
- [ ] Items: Energy Drink (heal), Debug Log (capture boost), Stack Trace (reveal stats)

## V5 - Progression

- [ ] Experience points and leveling
- [ ] Stat growth on level up
- [ ] Learn new moves at certain levels
- [ ] Evolution system:
  - CallbackHell → AsyncAwait
  - MemoryLeak → GarbageCollector
  - SpaghettiCode → CleanArchitecture
  - NullPointer → OptionalChaining
  - RaceCondition → Mutex
- [ ] Party management (swap active BugMon)
- [ ] Wild BugMon level scaling by area

## V6 - Boss Battles & Story

- [ ] Boss trainers with unique dialog:
  - The Tech Lead (mid-boss)
  - The Architect (late-boss)
  - Legacy System (final boss - ancient, overpowered, undocumented)
- [ ] Simple story: "The codebase is infested with bugs. Debug them all."
- [ ] Victory condition / ending screen
- [ ] Post-game: harder encounters, rare BugMon

## V7 - Quality of Life

- [ ] Save/load (localStorage)
- [ ] Settings menu (volume, speed)
- [ ] BugDex (collection tracker)
- [ ] Move descriptions shown in battle
- [ ] Smooth tile-to-tile movement animation
- [ ] Mobile touch controls
- [ ] Minimap

## Stretch Goals

- [ ] Procedural BugMon generator (random stats, names, sprites)
- [ ] Online trading (WebRTC or simple server)
- [ ] Map editor
- [ ] Mod support (load custom JSON data)
- [ ] Achievements (catch all BugMon, win without taking damage, etc.)

## BugMon Ideas Backlog

| Name | Type | Concept |
|------|------|---------|
| NullPointer | reference | Points to nothing |
| RaceCondition | logic | Unpredictably fast |
| MemoryLeak | memory | Bloated, won't free |
| Deadlock | logic | Two threads, neither yields |
| OffByOne | logic | Always slightly wrong |
| MergeConflict | syntax | Two versions collide |
| CallbackHell | runtime | Nested chaos |
| Heisenbug | logic | Changes when observed |
| InfiniteLoop | runtime | Never stops |
| SpaghettiCode | syntax | Tangled mess |
| SegFaultling | memory | Illegal access creature |
| TypeCoercion | runtime | Shapeshifter |
| ZeroDivide | math | Approaches infinity |
| UnhandledPromise | runtime | Silently fails |
| BitRot | memory | Decays over time |

## Move Ideas Backlog

| Name | Power | Concept |
|------|-------|---------|
| SegFault | 10 | Crashes hard |
| Hotfix | 6 | Quick patch |
| ThreadLock | 8 | Seizes up |
| GarbageCollect | 7 | Cleans up |
| MemoryDump | 9 | Dumps everything |
| Refactor | 8 | Restructures |
| PatchDeploy | 7 | Ships a fix |
| ForceQuit | 12 | Terminates with prejudice |
| BlueScreen | 11 | Critical failure |
| CoreDump | 10 | Full memory spill |
| Rollback | 5 | Undo + heal? |
| HotReload | 6 | Quick refresh |
| Compile | 14 | 2-turn charge attack |
| NullCheck | 4 | Weak but reliable |
| BufferOverrun | 13 | High damage, high risk |
