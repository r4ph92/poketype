import type { RandomIndex } from '../../../src/domain/race-text';

// mulberry32: a tiny seeded generator, so every randomized test replays the same draws.
export function seededRandom(seed: number): RandomIndex {
  let state = seed >>> 0;
  return (count) => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return Math.floor((((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296) * count);
  };
}
