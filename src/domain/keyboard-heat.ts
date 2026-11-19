import { gameConfig } from '@/config/game';
import { keyForCharacter, type KeyboardLayout } from './keyboard-layouts';
import type { MissedCharacter } from './missed-characters';

const { shades } = gameConfig.missedKeys;

// 0 is a key never missed; 1 to `shades` are the shades, the highest the darkest.
export type HeatLevel = number;

// The counts one shade covers, both ends included.
export type HeatRange = { level: HeatLevel; min: number; max: number };

// keyCounts adds up the characters each key types; unplaced are the characters this keyboard cannot type.
export type KeyboardHeat = { keyCounts: ReadonlyMap<string, number>; maxCount: number; unplaced: MissedCharacter[] };

export function keyboardHeatOf(layout: KeyboardLayout, missed: readonly MissedCharacter[]): KeyboardHeat {
  const keyCounts = new Map<string, number>();
  const unplaced: MissedCharacter[] = [];
  for (const entry of missed) {
    const key = keyForCharacter(layout, entry.character);
    if (key) keyCounts.set(key.id, (keyCounts.get(key.id) ?? 0) + entry.count);
    else unplaced.push(entry);
  }
  return { keyCounts, maxCount: Math.max(0, ...keyCounts.values()), unplaced };
}

// Shades are relative to the most missed key, which always gets the darkest one, so every race uses the whole scale.
export function heatLevelOf(count: number, maxCount: number): HeatLevel {
  if (count <= 0 || maxCount <= 0) return 0;
  return Math.min(shades, Math.ceil((shades * count) / maxCount));
}

// Only the shades some count can fall in: with a maximum of 1, a single shade covers it.
export function heatLegend(maxCount: number): HeatRange[] {
  return Array.from({ length: shades }, (_, index) => index + 1)
    .map((level) => ({ level, min: Math.floor(((level - 1) * maxCount) / shades) + 1, max: Math.floor((level * maxCount) / shades) }))
    .filter(({ min, max }) => min <= max);
}
