import { describe, expect, it } from 'vitest';
import { parsePersonalRecord, personalRecordOf } from '../../src/domain/personal-record';

describe('personal record rule', () => {
  it('announces a beaten record with the previous best', () => {
    expect(personalRecordOf(45, 42)).toEqual({ kind: 'beaten', wpm: 45, previousWpm: 42 });
  });

  it('announces a first record when there is no earlier finished race', () => {
    expect(personalRecordOf(38, null)).toEqual({ kind: 'first', wpm: 38 });
  });

  it('shows nothing when the race is slower than the best', () => {
    expect(personalRecordOf(40, 42)).toBeNull();
  });

  it('shows nothing when the race ties the best', () => {
    expect(personalRecordOf(42, 42)).toBeNull();
  });

  it('compares the whole numbers the results display, never a hidden decimal', () => {
    expect(personalRecordOf(42.4, 41.6)).toBeNull();
    expect(personalRecordOf(44.6, 42.4)).toEqual({ kind: 'beaten', wpm: 45, previousWpm: 42 });
  });
});

describe('personal record parsing', () => {
  it.each([
    [null, null],
    [{ kind: 'first', wpm: 38 }, { kind: 'first', wpm: 38 }],
    [{ kind: 'beaten', wpm: 45, previousWpm: 42 }, { kind: 'beaten', wpm: 45, previousWpm: 42 }],
  ])('reads %j from a snapshot', (value, expected) => {
    expect(parsePersonalRecord(value)).toEqual(expected);
  });

  it.each([undefined, 'first', { kind: 'beaten', wpm: 45 }, { kind: 'first', wpm: -1 }, { kind: 'other', wpm: 3 }])('refuses %j', (value) => {
    expect(parsePersonalRecord(value)).toBeUndefined();
  });
});
