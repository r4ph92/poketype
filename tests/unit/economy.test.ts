import { describe, expect, it } from 'vitest';
import type { PokedexDex } from '../../src/assets/pokedex';
import { raceCoinsFor } from '../../src/domain/race-coins';
import { evolutionItemIds, parsePurchaseQuantity, priceOf, quantityInBag } from '../../src/domain/shop-item';
import { itemEvolutionOf, itemOptionsFor } from '../../src/domain/item-evolution';

describe('race Poké Dollars', () => {
  it('gives 200 to the winner and 100 to the last of two', () => {
    expect([raceCoinsFor(1, 2), raceCoinsFor(2, 2)]).toEqual([200, 100]);
  });

  it('gives 150 to the middle of three and spreads 100 to 200 across eight, rounded', () => {
    expect(raceCoinsFor(2, 3)).toBe(150);
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((place) => raceCoinsFor(place, 8))).toEqual([200, 186, 171, 157, 143, 129, 114, 100]);
  });

  it('gives an abandoner nothing and a field of one nothing', () => {
    expect(raceCoinsFor(null, 2)).toBe(0);
    expect(raceCoinsFor(1, 1)).toBe(0);
  });
});

describe('the shop catalogue', () => {
  it('sells each stone at 1 500 and the Poké Ball at 5', () => {
    expect(['fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone'].map((stone) => priceOf(stone as 'fire-stone'))).toEqual([1500, 1500, 1500, 1500, 1500]);
    expect(priceOf('poke-ball')).toBe(5);
  });

  it('sells the nine stones and the fifteen evolution items at 1 500 each', () => {
    expect(evolutionItemIds).toHaveLength(24);
    expect(evolutionItemIds).toEqual(expect.arrayContaining(['sun-stone', 'shiny-stone', 'dusk-stone', 'dawn-stone', 'metal-coat', 'prism-scale']));
    expect(evolutionItemIds.every((item) => priceOf(item) === 1500)).toBe(true);
  });

  it.each([['1', 1], ['99', 99], ['0', null], ['100', null], ['-1', null], ['2.5', null], ['', null], [null, null], ['1e2', null]])('reads the quantity %j as %j', (value, expected) => {
    expect(parsePurchaseQuantity(value)).toBe(expected);
  });

  it('counts a missing item as zero in the bag', () => {
    expect(quantityInBag([{ item: 'poke-ball', quantity: 3 }], 'poke-ball')).toBe(3);
    expect(quantityInBag([], 'moon-stone')).toBe(0);
  });
});

describe('stone evolutions', () => {
  it('evolves each species only with its own stone', () => {
    expect(itemEvolutionOf(25, 'thunder-stone')).toBe(26);
    expect(itemEvolutionOf(25, 'fire-stone')).toBeNull();
    expect(itemEvolutionOf(4, 'fire-stone')).toBeNull();
  });

  it('lets Eevee choose among three stones', () => {
    expect(itemOptionsFor(133)).toEqual([
      { item: 'water-stone', into: 134 },
      { item: 'thunder-stone', into: 135 },
      { item: 'fire-stone', into: 136 },
    ]);
  });

  it('holds the sixteen Gen 1 stone evolutions', () => {
    const sources: PokedexDex[] = [25, 30, 33, 35, 37, 39, 44, 58, 61, 70, 90, 102, 120, 133];
    const kantoStones: readonly string[] = ['fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone'];
    expect(sources.flatMap((dex) => itemOptionsFor(dex)).filter((option) => kantoStones.includes(option.item) && option.into <= 151).length).toBe(16);
  });
});
