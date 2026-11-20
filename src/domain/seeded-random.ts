import type { RandomSource } from './random-source';

const uint32Range = 2 ** 32;

// mulberry32: a tiny generator that gives the browser and the server the same sequence for a seed.
export function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / uint32Range;
  };
}

export type NumberRange = { readonly min: number; readonly max: number };

export function between(random: RandomSource, { min, max }: NumberRange): number {
  return min + random() * (max - min);
}

export function wholeBetween(random: RandomSource, { min, max }: NumberRange): number {
  return min + Math.floor(random() * (max - min + 1));
}

// A factor around 1, from 1 − fraction to 1 + fraction.
export function aroundOne(random: RandomSource, fraction: number): number {
  return 1 + (random() * 2 - 1) * fraction;
}

export function midpoint({ min, max }: NumberRange): number {
  return (min + max) / 2;
}
