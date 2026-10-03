import { describe, expect, it } from 'vitest';
import { badgeIds, badgesEarnedAfter, isBadgeId } from '../../src/domain/badges';
import { evolutionLineOf, isPokedexDex, isPokemonSpecies, speciesOfDex } from '../../src/domain/pokemon-catalog';
import { evolvedFormAt } from '../../src/domain/pokemon-evolution';
import { addXp, xpToNextLevel } from '../../src/domain/pokemon-level';
import { raceXpFor } from '../../src/domain/race-xp';
import { parseStarterDex } from '../../src/domain/starter';

const firstChoice = () => 0;

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
    expect(xpToNextLevel(99)).toBeNull();
  });

  it('keeps the XP left over below the next level', () => {
    expect(addXp({ level: 1, xp: 0 }, 50)).toEqual({ level: 1, xp: 50 });
    expect(addXp({ level: 1, xp: 50 }, 10)).toEqual({ level: 2, xp: 0 });
  });

  it('crosses several levels in one grant', () => {
    expect(addXp({ level: 1, xp: 0 }, 150)).toEqual({ level: 3, xp: 20 });
  });

  it('stops at level 99 and keeps no XP beyond it', () => {
    expect(addXp({ level: 98, xp: 1000 }, 150)).toEqual({ level: 99, xp: 0 });
    expect(addXp({ level: 99, xp: 0 }, 150)).toEqual({ level: 99, xp: 0 });
  });
});

describe('race XP', () => {
  it('gives 150 to the winner and 50 to the last of two', () => {
    expect(raceXpFor(1, 2)).toBe(150);
    expect(raceXpFor(2, 2)).toBe(50);
  });

  it('spreads 50 to 150 across a field of eight, rounded', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((place) => raceXpFor(place, 8))).toEqual([150, 136, 121, 107, 93, 79, 64, 50]);
  });

  it('lets tied racers share the better place and its XP', () => {
    expect(raceXpFor(1, 3)).toBe(150);
    expect(raceXpFor(3, 3)).toBe(50);
  });

  it('gives an abandoner nothing, and they still count in the field', () => {
    expect(raceXpFor(null, 2)).toBe(0);
    expect(raceXpFor(2, 3)).toBe(100);
  });

  it('counts a race only with at least two racers', () => {
    expect(raceXpFor(1, 1)).toBe(0);
  });
});

describe('evolution', () => {
  it('evolves at the level of the original games', () => {
    expect(evolvedFormAt(1, 15, firstChoice)).toBe(1);
    expect(evolvedFormAt(1, 16, firstChoice)).toBe(2);
  });

  it('takes several steps when the level allows', () => {
    expect(evolvedFormAt(10, 10, firstChoice)).toBe(12);
    expect(evolvedFormAt(1, 50, firstChoice)).toBe(3);
  });

  it('never evolves by stone, item or trade', () => {
    expect(evolvedFormAt(25, 50, firstChoice)).toBe(25);
    expect(evolvedFormAt(64, 50, firstChoice)).toBe(64);
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
    expect(speciesOfDex(649)).toBe('genesect');
    expect(isPokedexDex(649)).toBe(true);
    expect(isPokedexDex(650)).toBe(false);
  });

  it('recognizes only known species names', () => {
    expect(isPokemonSpecies('mew')).toBe(true);
    expect(isPokemonSpecies('constructor')).toBe(false);
    expect(isPokemonSpecies(4)).toBe(false);
  });

  it('lists a whole evolution family from any of its forms', () => {
    expect(evolutionLineOf(5)).toEqual([4, 5, 6]);
    expect(evolutionLineOf(134)).toEqual([133, 134, 135, 136, 196, 197, 470, 471]);
    expect(evolutionLineOf(25)).toEqual([25, 26, 172]);
    expect(evolutionLineOf(151)).toEqual([151]);
  });
});
