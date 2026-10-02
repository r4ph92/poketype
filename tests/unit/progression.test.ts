import { describe, expect, it } from 'vitest';
import { badgeIds, badgesEarnedAfter, isBadgeId } from '../../src/domain/badges';
import { evolutionLineOf, isPokedexDex, isPokemonSpecies, speciesOfDex } from '../../src/domain/pokemon-catalog';
import { xpToNextLevel } from '../../src/domain/pokemon-level';
import { parseStarterDex } from '../../src/domain/starter';

describe('starter choice', () => {
  it.each(['1', '4', '7'])('accepts the starter %s', (submitted) => {
    expect(parseStarterDex(submitted)).toBe(Number(submitted));
  });

  it.each(['25', '0', ' 4', '4.0', '', 'charmander'])('refuses any other species or value: "%s"', (submitted) => {
    expect(parseStarterDex(submitted)).toBeNull();
  });

  it('refuses a missing field', () => {
    expect(parseStarterDex(null)).toBeNull();
  });
});

describe('levels', () => {
  it('costs 50 + 10 × the current level to reach the next level', () => {
    expect(xpToNextLevel(5)).toBe(100);
    expect(xpToNextLevel(16)).toBe(210);
    expect(xpToNextLevel(49)).toBe(540);
  });

  it('stops at the maximum level', () => {
    expect(xpToNextLevel(50)).toBeNull();
  });
});

describe('badges', () => {
  it('has eight badges in Kanto order', () => {
    expect(badgeIds).toEqual(['boulder', 'cascade', 'thunder', 'rainbow', 'soul', 'marsh', 'volcano', 'earth']);
  });

  it('earns each badge at its finished-race milestone', () => {
    expect(badgesEarnedAfter(0)).toEqual([]);
    expect(badgesEarnedAfter(1)).toEqual(['boulder']);
    expect(badgesEarnedAfter(9)).toEqual(['boulder', 'cascade']);
    expect(badgesEarnedAfter(150)).toEqual(badgeIds);
  });

  it('recognizes only the known badges', () => {
    expect(isBadgeId('volcano')).toBe(true);
    expect(isBadgeId('toString')).toBe(false);
  });
});

describe('Pokémon catalog', () => {
  it('maps a Pokédex number to its species', () => {
    expect(speciesOfDex(25)).toBe('pikachu');
    expect(isPokedexDex(151)).toBe(true);
    expect(isPokedexDex(152)).toBe(false);
  });

  it('recognizes only known species names', () => {
    expect(isPokemonSpecies('mew')).toBe(true);
    expect(isPokemonSpecies('constructor')).toBe(false);
    expect(isPokemonSpecies(4)).toBe(false);
  });

  it('lists a whole evolution family from any of its forms', () => {
    expect(evolutionLineOf(5)).toEqual([4, 5, 6]);
    expect(evolutionLineOf(134)).toEqual([133, 134, 135, 136]);
    expect(evolutionLineOf(151)).toEqual([151]);
  });
});
