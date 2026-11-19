import { describe, expect, it } from 'vitest';
import { parsePersonalRecord, personalRecordOf } from '../../src/domain/personal-record';

describe('personal record rule at the display boundaries', () => {
  it('rounds the first record like the results table, half up', () => {
    expect(personalRecordOf(37.5, null)).toEqual({ kind: 'first', wpm: 38 });
    expect(personalRecordOf(37.49, null)).toEqual({ kind: 'first', wpm: 37 });
  });

  it('beats a best that displays one lower even when the raw gap is a hundredth', () => {
    expect(personalRecordOf(44.5, 44.49)).toEqual({ kind: 'beaten', wpm: 45, previousWpm: 44 });
  });

  it('never announces a record for a stored best stored just below a displayed tie', () => {
    expect(personalRecordOf(44.999, 44.5)).toBeNull();
  });

  it('announces a zero-speed finish as a first record rather than hiding it', () => {
    expect(personalRecordOf(0, null)).toEqual({ kind: 'first', wpm: 0 });
  });
});

describe('personal record parsing of a tampered snapshot', () => {
  it.each([{ kind: 'first', wpm: 38.5 }, { kind: 'beaten', wpm: 45, previousWpm: '42' }, { kind: 'first', wpm: Number.NaN }, [], 'null'])('refuses %j', (value) => {
    expect(parsePersonalRecord(value)).toBeUndefined();
  });

  it('keeps only the known fields of a first record', () => {
    expect(parsePersonalRecord({ kind: 'first', wpm: 38, previousWpm: 99 })).toEqual({ kind: 'first', wpm: 38 });
  });
});
