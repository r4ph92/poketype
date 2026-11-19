import { gameConfig } from '@/config/game';
import { isCount, isJsonObject } from './json-guards';
import type { ErrorMode } from './text-settings';

// A miss is the passage character the racer was expected to type when a keystroke was wrong (RES-03, #74).
export type MissedCharacterCounts = Readonly<Record<string, number>>;

export type MissedCharacter = { character: string; count: number };

export const noMissedCharacters: MissedCharacterCounts = {};

type CursorCounters = { position: number; keystrokes: number; rejectedKeystrokes: number };

export type MissedPositionsToJudge = {
  previous: CursorCounters;
  report: CursorCounters & { missedPositions: readonly number[] };
  passageLength: number;
  errorMode: ErrorMode;
};

type IndexRange = { first: number; last: number };

// A report names the passage index under the cursor for its new wrong keystrokes. It may name fewer (an older page, or more errors than fit
// in one report), never more, and only indices the cursor could have been on since the previous report.
export function areMissedPositionsPlausible({ previous, report, passageLength, errorMode }: MissedPositionsToJudge): boolean {
  const { missedPositions } = report;
  const newErrors = report.rejectedKeystrokes - previous.rejectedKeystrokes;
  if (missedPositions.length > Math.min(newErrors, gameConfig.missedKeys.maxPositionsPerReport)) return false;
  const { first, last } = reachableRange(previous, report, passageLength, errorMode);
  if (!missedPositions.every((index) => index >= first && index <= last)) return false;
  return errorMode === 'free' || isNonDecreasing(missedPositions);
}

// Blocked mode: the cursor only moves forward, from the previous position to the reported one.
// Free mode: Backspace may take it back to the start, and each keystroke moves it on by at most one, so it never passes the keystroke count.
// The count, not the previous position, bounds it: the server may know fewer keystrokes than the page had typed.
function reachableRange(previous: CursorCounters, report: CursorCounters, passageLength: number, errorMode: ErrorMode): IndexRange {
  const lastIndex = passageLength - 1;
  if (errorMode === 'blocked') return { first: previous.position, last: Math.min(report.position, lastIndex) };
  return { first: 0, last: Math.min(lastIndex, report.keystrokes - 1) };
}

function isNonDecreasing(indices: readonly number[]): boolean {
  return indices.every((index, order) => order === 0 || index >= indices[order - 1]!);
}

// The latest unacknowledged misses, at most one report's worth; older ones beyond that stay counted as errors only.
export function positionsToReport(missedPositions: readonly number[], unacknowledgedErrors: number): number[] {
  const count = Math.min(unacknowledgedErrors, gameConfig.missedKeys.maxPositionsPerReport, missedPositions.length);
  return count > 0 ? missedPositions.slice(-count) : [];
}

// The keys are passage characters, so a race holds at most as many as its passage has distinct characters; maxCharacters caps it anyway.
export function addMissedCharacters(counts: MissedCharacterCounts, characters: readonly string[], missedPositions: readonly number[]): MissedCharacterCounts {
  const next = new Map(Object.entries(counts));
  for (const position of missedPositions) countOne(next, characters[position]);
  return Object.fromEntries(next);
}

function countOne(counts: Map<string, number>, character: string | undefined): void {
  if (character === undefined) return;
  const count = counts.get(character);
  if (count === undefined && counts.size >= gameConfig.missedKeys.maxCharacters) return;
  counts.set(character, (count ?? 0) + 1);
}

// null when the race kept no record: it settled before #74.
export function missedKeysOf(counts: MissedCharacterCounts | null): MissedCharacter[] | null {
  return counts === null ? null : mostMissedFirst(counts);
}

// Most missed first; equal counts in code-point order, so the server render and the browser agree.
export function mostMissedFirst(counts: MissedCharacterCounts): MissedCharacter[] {
  return Object.entries(counts)
    .map(([character, count]) => ({ character, count }))
    .sort((left, right) => right.count - left.count || compareCodePoints(left.character, right.character));
}

function compareCodePoints(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

// undefined means malformed; null means the race kept no record (settled before #74, or not over yet).
export function parseMissedCharacters(value: unknown): MissedCharacter[] | null | undefined {
  if (value === null) return null;
  if (!Array.isArray(value) || value.length > gameConfig.missedKeys.maxCharacters) return undefined;
  const missed = value.map(parseMissedCharacter);
  return missed.every((entry) => entry !== null) ? missed : undefined;
}

function parseMissedCharacter(value: unknown): MissedCharacter | null {
  if (!isJsonObject(value) || typeof value.character !== 'string' || !isCount(value.count) || value.count === 0) return null;
  return Array.from(value.character).length === 1 ? { character: value.character, count: value.count } : null;
}
