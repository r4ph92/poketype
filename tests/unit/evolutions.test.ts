import { describe, expect, it } from 'vitest';
import { itemEvolutions } from '../../src/assets/item-evolutions';
import { levelEvolutions } from '../../src/assets/level-evolutions';
import type { PokedexDex } from '../../src/assets/pokedex';
import { gameConfig } from '../../src/config/game';
import { itemEvolutionOf, itemOptionsFor } from '../../src/domain/item-evolution';
import { evolvedFormAt } from '../../src/domain/pokemon-evolution';
import { evolutionItemIds } from '../../src/domain/shop-item';

const firstChoice = () => 0;
const babies: PokedexDex[] = [172, 173, 174, 175, 236, 238, 239, 240, 298, 360, 406, 433, 438, 439, 440, 446, 458];
const happiny = 440;

describe('babies', () => {
  it.each(babies)('baby #%i never evolves, at any level', (baby) => {
    expect(evolvedFormAt(baby, gameConfig.progression.maxLevel, firstChoice)).toBe(baby);
    expect(levelEvolutions.some((evolution) => evolution.from === baby)).toBe(false);
  });

  it('lets only Happiny use an item (the Oval Stone)', () => {
    expect(babies.filter((baby) => itemOptionsFor(baby).length > 0)).toEqual([happiny]);
    expect(itemEvolutionOf(happiny, 'oval-stone')).toBe(113);
  });
});

describe('evolutions the games trigger by friendship, a move or a place', () => {
  it('evolves friendship evolutions at level 30', () => {
    expect(gameConfig.evolution.friendshipLevel).toBe(30);
    for (const [from, into] of [[42, 169], [113, 242], [427, 428], [447, 448], [527, 528], [541, 542]] as const) {
      expect(evolvedFormAt(from, 29, firstChoice)).toBe(from);
      expect(evolvedFormAt(from, 30, firstChoice)).toBe(into);
    }
  });

  it('evolves move evolutions at level 33', () => {
    expect(gameConfig.evolution.moveLevel).toBe(33);
    for (const [from, into] of [[108, 463], [114, 465], [193, 469], [221, 473], [190, 424]] as const) {
      expect(evolvedFormAt(from, 32, firstChoice)).toBe(from);
      expect(evolvedFormAt(from, 33, firstChoice)).toBe(into);
    }
  });

  it('evolves Magnezone and Probopass with a Thunder Stone instead of a place', () => {
    expect(itemEvolutionOf(82, 'thunder-stone')).toBe(462);
    expect(itemEvolutionOf(299, 'thunder-stone')).toBe(476);
    expect(evolvedFormAt(82, 99, firstChoice)).toBe(82);
  });
});

describe('Eevee', () => {
  it('still chooses Vaporeon, Jolteon or Flareon with the three Kanto stones only', () => {
    expect(itemOptionsFor(133).map((option) => option.into)).toEqual([134, 135, 136]);
  });

  it('evolves at level 30 into Espeon, Umbreon, Leafeon or Glaceon, drawn by the random source', () => {
    expect(evolvedFormAt(133, 29, firstChoice)).toBe(133);
    expect([0, 0.25, 0.5, 0.75].map((roll) => evolvedFormAt(133, 30, () => roll))).toEqual([196, 197, 470, 471]);
  });
});

describe('several evolutions at one level', () => {
  it('draws Wurmple into Silcoon or Cascoon at level 7, then follows the drawn branch', () => {
    expect(evolvedFormAt(265, 7, () => 0)).toBe(266);
    expect(evolvedFormAt(265, 7, () => 0.5)).toBe(268);
    expect(evolvedFormAt(265, 10, () => 0)).toBe(267);
  });
});

describe('evolution items', () => {
  it.each([
    [95, 'metal-coat', 208], [123, 'metal-coat', 212], [79, 'kings-rock', 199], [61, 'kings-rock', 186], [117, 'dragon-scale', 230],
    [137, 'up-grade', 233], [233, 'dubious-disc', 474], [112, 'protector', 464], [125, 'electirizer', 466], [126, 'magmarizer', 467],
    [356, 'reaper-cloth', 477], [215, 'razor-claw', 461], [207, 'razor-fang', 472], [366, 'deep-sea-tooth', 367], [366, 'deep-sea-scale', 368],
    [349, 'prism-scale', 350], [44, 'sun-stone', 182], [176, 'shiny-stone', 468], [198, 'dusk-stone', 430], [281, 'dawn-stone', 475], [361, 'dawn-stone', 478],
  ] as const)('#%i uses %s to become #%i', (from, item, into) => {
    expect(itemEvolutionOf(from, item)).toBe(into);
  });

  it('uses only items the shop sells, and every evolution item the shop sells evolves someone', () => {
    const used = new Set<string>(itemEvolutions.map((evolution) => evolution.item));
    expect([...used].every((item) => (evolutionItemIds as readonly string[]).includes(item))).toBe(true);
    expect(evolutionItemIds.filter((item) => !used.has(item))).toEqual([]);
  });
});

describe('pure trade evolutions', () => {
  it.each([64, 67, 75, 93, 525, 533, 588, 616])('#%i waits for trading: no level and no item evolves it', (dex) => {
    expect(evolvedFormAt(dex as PokedexDex, 99, firstChoice)).toBe(dex);
    expect(itemOptionsFor(dex as PokedexDex)).toEqual([]);
  });
});
