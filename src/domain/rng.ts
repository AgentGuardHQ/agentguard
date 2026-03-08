// Seeded pseudo-random number generator (mulberry32)
// Allows deterministic battle replays when given the same seed.
// Pure function, no dependencies.

export interface RNG {
  /** Returns float in [0, 1) */
  random(): number;
  /** Returns integer in [min, max] inclusive */
  int(min: number, max: number): number;
  /** Pick random element from array */
  pick<T>(arr: readonly T[]): T;
  /** The original seed */
  readonly seed: number;
}

export function createRNG(seed: number): RNG {
  let state = seed | 0;

  function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    random: next,
    int(min: number, max: number): number {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    pick<T>(arr: readonly T[]): T {
      return arr[Math.floor(next() * arr.length)];
    },
    seed,
  };
}
