import { describe, expect, it } from 'vitest';
import { pokedex } from '../../src/assets/pokedex';
import { legendaryRewards } from '../../src/config/achievements';
import { parseThrowNumber, throwResultOf } from '../../src/domain/encounter-throw';
import { freeSlots, splitIntoBoxes, storageCapacity } from '../../src/domain/pc-storage';
import type { RandomSource } from '../../src/domain/random-source';
import { catchesOnThrow, drawWildPokemon, earnsEncounter, rarityOf, wildDexes } from '../../src/domain/wild-encounter';

function sequence(...values: number[]): RandomSource {
  let index = 0;
  return () => values[index++ % values.length]!;
}

const never: RandomSource = () => 0.999999;
const always: RandomSource = () => 0;

describe('who meets a wild Pokémon', () => {
  it('always gives one to the first three places, ties included', () => {
    for (const place of [1, 2, 3]) expect(earnsEncounter(place, never)).toBe(true);
  });

  it('gives every other ranked racer a 10% chance', () => {
    expect(earnsEncounter(4, () => 0.0999)).toBe(true);
    expect(earnsEncounter(4, () => 0.1)).toBe(false);
    expect(earnsEncounter(8, always)).toBe(true);
  });

  it('never gives one to an abandoner', () => {
    expect(earnsEncounter(null, always)).toBe(false);
  });
});

const babyDexes = new Set<number>([172, 173, 174, 175, 236, 238, 239, 240, 298, 360, 406, 433, 438, 439, 440, 446, 458]);

// Babies never evolve, so the form each baby would evolve into spawns as a base form too.
function isWildBaseForm(entry: (typeof pokedex)[number]): boolean {
  return entry.evolvesFrom === null || babyDexes.has(entry.evolvesFrom);
}

describe('the wild pool', () => {
  it('holds only base forms and the first evolutions of babies', () => {
    const evolved = new Set<number>(pokedex.filter((entry) => !isWildBaseForm(entry)).map((entry) => entry.dex));
    expect(wildDexes.filter((dex) => evolved.has(dex))).toEqual([]);
  });

  it('lets the evolved forms of babies spawn, such as Pikachu, Marill, Snorlax and Togetic', () => {
    expect(wildDexes).toEqual(expect.arrayContaining([25, 183, 143, 176, 237, 202]));
  });

  it('never holds a Kanto legendary', () => {
    for (const reward of legendaryRewards) expect(wildDexes).not.toContain(reward.dex);
  });

  it('holds every other base form, starters included', () => {
    const legendaries = new Set<number>(legendaryRewards.map((reward) => reward.dex));
    const bases = pokedex.filter((entry) => isWildBaseForm(entry) && !legendaries.has(entry.dex) && entry.rarity !== 'legendary').map((entry) => entry.dex);
    expect([...wildDexes].sort((first, second) => first - second)).toEqual(bases);
    expect(wildDexes).toEqual(expect.arrayContaining([1, 4, 7]));
  });
});

describe('drawing a wild Pokémon', () => {
  it('draws the common tier for the first 60% of the roll, uncommon for the next 30% and rare for the last 10%', () => {
    expect(rarityOf(drawWildPokemon(sequence(0, 0, 0)).dex)).toBe('common');
    expect(rarityOf(drawWildPokemon(sequence(0.5999, 0, 0)).dex)).toBe('common');
    expect(rarityOf(drawWildPokemon(sequence(0.6, 0, 0)).dex)).toBe('uncommon');
    expect(rarityOf(drawWildPokemon(sequence(0.8999, 0, 0)).dex)).toBe('uncommon');
    expect(rarityOf(drawWildPokemon(sequence(0.9, 0, 0)).dex)).toBe('rare');
    expect(rarityOf(drawWildPokemon(never).dex)).toBe('rare');
  });

  it('draws a level from 1 to 5', () => {
    expect(drawWildPokemon(always).level).toBe(1);
    expect(drawWildPokemon(never).level).toBe(5);
    expect(drawWildPokemon(sequence(0, 0, 0.5)).level).toBe(3);
  });

  it('draws only base forms from the pool across the whole roll range', () => {
    for (let step = 0; step < 100; step += 1) {
      const pokemon = drawWildPokemon(() => step / 100);
      expect(wildDexes).toContain(pokemon.dex);
      expect(pokemon.level).toBeGreaterThanOrEqual(1);
      expect(pokemon.level).toBeLessThanOrEqual(5);
    }
  });
});

describe('catching', () => {
  it.each([
    [19, 'common', 0.6999, 0.7],
    [25, 'uncommon', 0.4499, 0.45],
    [147, 'rare', 0.1999, 0.2],
  ] as const)('catches #%s (%s) below its catch rate only', (dex, tier, below, at) => {
    expect(rarityOf(dex)).toBe(tier);
    expect(catchesOnThrow(dex, () => below)).toBe(true);
    expect(catchesOnThrow(dex, () => at)).toBe(false);
  });

  it('never catches a species with no tier', () => {
    expect(catchesOnThrow(150, always)).toBe(false);
  });
});

describe('PC boxes', () => {
  it('holds 30 Pokémon per box', () => {
    expect(storageCapacity(1)).toBe(30);
    expect(freeSlots(29, 1)).toBe(1);
    expect(freeSlots(30, 1)).toBe(0);
    expect(freeSlots(30, 2)).toBe(30);
  });

  it('fills the boxes in order and never hides a Pokémon beyond them', () => {
    const collection = Array.from({ length: 31 }, (_, index) => index);
    expect(splitIntoBoxes(collection, 2).map((box) => box.length)).toEqual([30, 1]);
    expect(splitIntoBoxes(collection, 1).map((box) => box.length)).toEqual([30, 1]);
    expect(splitIntoBoxes([], 1)).toEqual([[]]);
  });
});

describe('a throw', () => {
  it('catches, misses with the throws left, or lets the Pokémon flee after the third miss', () => {
    expect(throwResultOf(19, true, 2)).toEqual({ outcome: 'caught', dex: 19 });
    expect(throwResultOf(19, false, 1)).toEqual({ outcome: 'missed', dex: 19, throwsLeft: 2 });
    expect(throwResultOf(19, false, 3)).toEqual({ outcome: 'fled', dex: 19 });
  });

  it.each(['1', '2', '3'])('accepts the throw number %s', (submitted) => {
    expect(parseThrowNumber(submitted)).toBe(Number(submitted));
  });

  it.each(['0', '4', '1.0', ' 1', '', 'one', null])('refuses the throw number "%s"', (submitted) => {
    expect(parseThrowNumber(submitted)).toBeNull();
  });
});
