import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import {
  addMissedCharacters,
  areMissedPositionsPlausible,
  mostMissedFirst,
  parseMissedCharacters,
  positionsToReport,
  type MissedPositionsToJudge,
} from '../../src/domain/missed-characters';
import { passageCharacters } from '../../src/domain/passage';
import { judgeProgressReport, type AcceptedProgress } from '../../src/domain/progress-report';
import { applyInput, untypedState, type TypingInput, type TypingState } from '../../src/domain/typing-progress';
import type { ErrorMode } from '../../src/domain/text-settings';

const { maxPositionsPerReport, maxCharacters } = gameConfig.missedKeys;
const passage = passageCharacters('été sûr ça');
const untouched = { position: 0, keystrokes: 0, rejectedKeystrokes: 0 };

function typed(data: string): TypingInput {
  return { inputType: 'insertText', data, isComposing: false };
}

const backspace: TypingInput = { inputType: 'deleteContentBackward', data: null, isComposing: false };

function typeAll(inputs: TypingInput[], errorMode: ErrorMode): TypingState {
  return inputs.reduce((state, input) => applyInput(state, passage, input, errorMode), untypedState);
}

function judgeMisses(report: MissedPositionsToJudge['report'], errorMode: ErrorMode = 'blocked', previous = untouched): boolean {
  return areMissedPositionsPlausible({ previous, report, passageLength: passage.length, errorMode });
}

describe('where a wrong keystroke happened, on the page', () => {
  it('in required correction, is the expected character under the cursor, once per wrong keystroke', () => {
    const state = typeAll([typed('e'), typed('e'), typed('é'), typed('t'), typed('e')], 'blocked');
    expect(state.missedPositions).toEqual([0, 0, 2]);
  });

  it('in free typing, is the index the wrong character was typed at, even after Backspace took the cursor back', () => {
    const state = typeAll([typed('e'), typed('t'), backspace, backspace, typed('x')], 'free');
    expect(state.missedPositions).toEqual([0, 0]);
  });

  it('counts a decomposed or dead-key letter the passage does not expect as a miss on the expected character', () => {
    const state = typeAll([typed('é'), typed('t'), typed('ê')], 'blocked');
    expect(state.missedPositions).toEqual([2]);
    expect(passage[2]).toBe('é');
  });

  it('never counts a lone dead key as a miss', () => {
    expect(typeAll([typed('´')], 'blocked').missedPositions).toEqual([]);
  });
});

describe('missed positions sent with a report', () => {
  it('sends the latest unacknowledged ones, at most one report worth', () => {
    expect(positionsToReport([1, 2, 3], 2)).toEqual([2, 3]);
    expect(positionsToReport([1, 2, 3], 0)).toEqual([]);
    expect(positionsToReport([4], 3)).toEqual([4]);
    const many = Array.from({ length: maxPositionsPerReport + 5 }, (_, index) => index);
    expect(positionsToReport(many, many.length)).toEqual(many.slice(5));
  });
});

describe('judging missed positions on the server', () => {
  const report = { position: 4, keystrokes: 7, rejectedKeystrokes: 3 };

  it('accepts in required correction indices between the previous and the reported cursor, in order', () => {
    expect(judgeMisses({ ...report, missedPositions: [0, 2, 4] })).toBe(true);
    expect(judgeMisses({ ...report, missedPositions: [] })).toBe(true);
  });

  it('accepts fewer positions than new errors, from a page loaded before missed keys were recorded', () => {
    expect(judgeMisses({ ...report, missedPositions: [2] })).toBe(true);
  });

  it.each([
    ['more positions than new errors', [0, 1, 2, 3]],
    ['an index behind the previous cursor', [1]],
    ['an index past the reported cursor', [5]],
    ['indices out of order', [2, 1]],
  ])('refuses in required correction %s', (_label, missedPositions) => {
    expect(judgeMisses({ ...report, missedPositions }, 'blocked', { position: 2, keystrokes: 2, rejectedKeystrokes: 0 })).toBe(false);
  });

  it('refuses an index past the passage, even on the finishing report', () => {
    const finish = { position: passage.length, keystrokes: passage.length + 1, rejectedKeystrokes: 1 };
    expect(judgeMisses({ ...finish, missedPositions: [passage.length - 1] })).toBe(true);
    expect(judgeMisses({ ...finish, missedPositions: [passage.length] })).toBe(false);
  });

  it('accepts in free typing an earlier index the cursor went back to, in any order', () => {
    const previous = { position: 5, keystrokes: 6, rejectedKeystrokes: 1 };
    expect(judgeMisses({ position: 3, keystrokes: 8, rejectedKeystrokes: 3, missedPositions: [6, 0] }, 'free', previous)).toBe(true);
  });

  it('refuses in free typing an index further than the new keystrokes could reach', () => {
    const previous = { position: 5, keystrokes: 6, rejectedKeystrokes: 1 };
    expect(judgeMisses({ position: 7, keystrokes: 8, rejectedKeystrokes: 2, missedPositions: [7] }, 'free', previous)).toBe(false);
  });

  it('makes the whole report implausible, so nothing is stored', () => {
    const previous: AcceptedProgress = { lastSequence: 0, position: 0, correctCharacters: 0, keystrokes: 0, rejectedKeystrokes: 0 };
    const progress = { sequence: 1, position: 2, correctCharacters: 2, keystrokes: 3, rejectedKeystrokes: 1 };
    const judge = (missedPositions: number[]) =>
      judgeProgressReport({ previous, report: { ...progress, missedPositions }, passageLength: passage.length, elapsedSinceStartMs: 10_000, errorMode: 'blocked' });
    expect(judge([1])).toBe('accepted');
    expect(judge([9])).toBe('implausible');
  });
});

describe('counting missed characters', () => {
  it('counts the stored passage character at each judged index, accents and ç included', () => {
    const counts = addMissedCharacters({}, passage, [0, 0, 2, 8, 3]);
    expect(counts).toEqual({ é: 3, ç: 1, ' ': 1 });
    expect(addMissedCharacters(counts, passage, [8])).toEqual({ é: 3, ç: 2, ' ': 1 });
  });

  it('counts an NFC passage letter once, however the player typed it', () => {
    const nfcPassage = passageCharacters('é'.normalize('NFC'));
    expect(addMissedCharacters({}, nfcPassage, [0])).toEqual({ é: 1 });
  });

  it('keeps at most the configured number of distinct characters, still counting those it holds', () => {
    const many = Object.fromEntries(Array.from({ length: maxCharacters }, (_, index) => [String.fromCodePoint(0x100 + index), 1]));
    const counts = addMissedCharacters(many, ['z', String.fromCodePoint(0x100)], [0, 1]);
    expect(Object.keys(counts)).toHaveLength(maxCharacters);
    expect(counts.z).toBeUndefined();
    expect(counts[String.fromCodePoint(0x100)]).toBe(2);
  });

  it('lists the most missed first, equal counts in code-point order', () => {
    expect(mostMissedFirst({ s: 2, é: 4, a: 2 })).toEqual([
      { character: 'é', count: 4 },
      { character: 'a', count: 2 },
      { character: 's', count: 2 },
    ]);
  });
});

describe('reading missed characters from a snapshot', () => {
  it('accepts a list of single characters with positive counts, or null when none were recorded', () => {
    expect(parseMissedCharacters([{ character: 'é', count: 4 }])).toEqual([{ character: 'é', count: 4 }]);
    expect(parseMissedCharacters([])).toEqual([]);
    expect(parseMissedCharacters(null)).toBeNull();
  });

  it.each([
    ['a word', [{ character: 'ab', count: 1 }]],
    ['a zero count', [{ character: 'a', count: 0 }]],
    ['a fractional count', [{ character: 'a', count: 1.5 }]],
    ['an object instead of a list', { a: 1 }],
    ['too many entries', Array.from({ length: maxCharacters + 1 }, () => ({ character: 'a', count: 1 }))],
  ])('rejects %s', (_label, value) => {
    expect(parseMissedCharacters(value)).toBeUndefined();
  });
});
