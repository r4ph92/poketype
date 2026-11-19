import { describe, expect, it } from 'vitest';
import { heatLegend, heatLevelOf, keyboardHeatOf, mostMissedKeys } from '../../src/domain/keyboard-heat';
import { keyboardLayoutIds, keyboardLayouts, keyForCharacter, rowWidth, type KeyboardLayoutId } from '../../src/domain/keyboard-layouts';

function keyLabel(layoutId: KeyboardLayoutId, character: string): string | null {
  return keyForCharacter(keyboardLayouts[layoutId], character)?.label ?? null;
}

const raceCharacters = Array.from(" !#'(),-.0123456789:;?ABCDEFGHIJKLMNOPQRSTUVWYabcdefghijklmnopqrstuvwxyzÀàâçèéêîôùû");

describe('keyboard layouts', () => {
  it.each(keyboardLayoutIds)('%s draws rows of equal width with one key id each', (layoutId) => {
    const { rows } = keyboardLayouts[layoutId];
    for (const row of rows) expect(row.reduce((total, key) => total + key.width, 0)).toBe(rowWidth);
    const ids = rows.flat().map((key) => key.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(keyboardLayoutIds)('%s places every character a race text can hold', (layoutId) => {
    expect(raceCharacters.filter((character) => keyForCharacter(keyboardLayouts[layoutId], character) === null)).toEqual([]);
  });

  it('puts a character on the key that types it, and a capital on its letter key', () => {
    expect(keyLabel('canadian-multilingual', 'é')).toBe('É');
    expect(keyLabel('canadian-multilingual', 'È')).toBe('È');
    expect(keyLabel('french-azerty', 'é')).toBe('é');
    expect(keyLabel('french-azerty', 'À')).toBe('à');
    expect(keyLabel('us-qwerty', 'S')).toBe('S');
    expect(keyLabel('canadian-french', "'")).toBe(',');
    expect(keyLabel('french-azerty', '1')).toBe('&');
    expect(keyLabel('french-azerty', '#')).toBe('"');
  });

  it('puts a character that needs a dead key on its base letter key, never on the dead key', () => {
    expect(keyLabel('canadian-french', 'è')).toBe('E');
    expect(keyLabel('canadian-french', 'ç')).toBe('C');
    expect(keyLabel('canadian-multilingual', 'ê')).toBe('E');
    expect(keyLabel('french-azerty', 'ô')).toBe('O');
    expect(keyLabel('us-qwerty', 'é')).toBe('E');
    expect(keyLabel('us-qwerty', 'Ç')).toBe('C');
  });

  it('reads a decomposed character like its composed form', () => {
    expect(keyLabel('canadian-multilingual', 'é')).toBe('É');
    expect(keyLabel('canadian-french', 'è')).toBe('E');
  });

  it('places the space on the space bar and nothing for a character the keyboard cannot type', () => {
    expect(keyForCharacter(keyboardLayouts['us-qwerty'], ' ')?.width).toBe(7);
    expect(keyForCharacter(keyboardLayouts['us-qwerty'], '«')).toBeNull();
    expect(keyForCharacter(keyboardLayouts['canadian-french'], 'œ')).toBeNull();
  });
});

describe('keyboard heat', () => {
  const missed = [{ character: 'é', count: 4 }, { character: 'e', count: 1 }, { character: 's', count: 2 }, { character: '«', count: 1 }];

  it('adds up the characters each key types, for the chosen keyboard', () => {
    const usKeyboard = keyboardLayouts['us-qwerty'];
    const heat = keyboardHeatOf(usKeyboard, missed);
    expect(heat.keyCounts.get(keyForCharacter(usKeyboard, 'e')!.id)).toBe(5);
    expect(heat.maxCount).toBe(5);
    expect(heat.unplaced).toEqual([{ character: '«', count: 1 }]);
  });

  it('keeps é and e apart on a keyboard with an é key, and places « there', () => {
    const csa = keyboardLayouts['canadian-french'];
    const heat = keyboardHeatOf(csa, missed);
    expect(heat.keyCounts.get(keyForCharacter(csa, 'é')!.id)).toBe(4);
    expect(heat.keyCounts.get(keyForCharacter(csa, 'e')!.id)).toBe(1);
    expect(heat.unplaced).toEqual([]);
  });

  it('lists the keys most missed first, a key once whatever its capital, and the unplaced characters', () => {
    const usKeyboard = keyboardLayouts['us-qwerty'];
    const entries = [{ character: 's', count: 2 }, { character: 'S', count: 1 }, { character: 'é', count: 1 }, { character: '«', count: 1 }];
    expect(mostMissedKeys(usKeyboard, keyboardHeatOf(usKeyboard, entries))).toEqual([{ label: 'S', count: 3 }, { label: 'E', count: 1 }, { label: '«', count: 1 }]);
  });

  it('has no count and no shade without a miss', () => {
    expect(keyboardHeatOf(keyboardLayouts['us-qwerty'], [])).toEqual({ keyCounts: new Map(), maxCount: 0, unplaced: [] });
    expect(heatLegend(0)).toEqual([]);
  });
});

describe('heat shades', () => {
  it('gives the most missed key the darkest shade and lighter keys lighter ones', () => {
    expect(heatLevelOf(4, 4)).toBe(3);
    expect(heatLevelOf(2, 4)).toBe(2);
    expect(heatLevelOf(1, 4)).toBe(1);
    expect(heatLevelOf(0, 4)).toBe(0);
    expect(heatLevelOf(1, 1)).toBe(3);
  });

  it('lists in the legend the counts each shade covers, without empty shades', () => {
    expect(heatLegend(4)).toEqual([{ level: 1, min: 1, max: 1 }, { level: 2, min: 2, max: 2 }, { level: 3, min: 3, max: 4 }]);
    expect(heatLegend(1)).toEqual([{ level: 3, min: 1, max: 1 }]);
    expect(heatLegend(2)).toEqual([{ level: 2, min: 1, max: 1 }, { level: 3, min: 2, max: 2 }]);
    expect(heatLegend(10)).toEqual([{ level: 1, min: 1, max: 3 }, { level: 2, min: 4, max: 6 }, { level: 3, min: 7, max: 10 }]);
  });

  it('agrees with the legend for every count', () => {
    for (const maxCount of [1, 2, 3, 5, 7, 12]) {
      for (const { level, min, max } of heatLegend(maxCount)) {
        for (let count = min; count <= max; count++) expect(heatLevelOf(count, maxCount)).toBe(level);
      }
    }
  });
});
