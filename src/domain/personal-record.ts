import { isCount, isJsonObject } from './json-guards';

// Whole WPM as the results show it: 45 beats 42, but a tenth of a word never beats the same displayed number.
export type PersonalRecord = { kind: 'first'; wpm: number } | { kind: 'beaten'; wpm: number; previousWpm: number };

export function personalRecordOf(grossWpm: number, previousBestWpm: number | null): PersonalRecord | null {
  const wpm = Math.round(grossWpm);
  if (previousBestWpm === null) return { kind: 'first', wpm };
  const previousWpm = Math.round(previousBestWpm);
  return wpm > previousWpm ? { kind: 'beaten', wpm, previousWpm } : null;
}

export function parsePersonalRecord(value: unknown): PersonalRecord | null | undefined {
  if (value === null) return null;
  if (!isJsonObject(value)) return undefined;
  const { kind, wpm, previousWpm } = value;
  if (!isCount(wpm)) return undefined;
  if (kind === 'first') return { kind, wpm };
  return kind === 'beaten' && isCount(previousWpm) ? { kind, wpm, previousWpm } : undefined;
}
