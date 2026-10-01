import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import { judgeProgressReport, parseProgressReport, type AcceptedProgress, type ProgressReport } from '../../src/domain/progress-report';

const { maxCharactersPerSecond, maxKeystrokesPerSecond, progressBurstAllowance } = gameConfig.race;
const passageLength = 64;
const untouched: AcceptedProgress = { lastSequence: 0, position: 0, keystrokes: 0, rejectedKeystrokes: 0 };
const valid: ProgressReport = { sequence: 1, position: 5, keystrokes: 6, rejectedKeystrokes: 1 };

function judge(report: ProgressReport, previous = untouched, elapsedSinceStartMs = 10_000) {
  return judgeProgressReport({ previous, report, passageLength, elapsedSinceStartMs });
}

describe('parseProgressReport', () => {
  it('accepts four non-negative integer counters with a sequence from 1', () => {
    expect(parseProgressReport(valid)).toEqual(valid);
    expect(parseProgressReport({ sequence: 1, position: 0, keystrokes: 0, rejectedKeystrokes: 0 })).not.toBeNull();
  });

  it('keeps only the known fields', () => {
    expect(parseProgressReport({ ...valid, finished: true, winner: 'Zoe' })).toEqual(valid);
  });

  it.each([
    ['null', null],
    ['an array', [valid]],
    ['a string', '{"sequence":1}'],
    ['a missing field', { sequence: 1, position: 0, keystrokes: 0 }],
    ['a zero sequence', { ...valid, sequence: 0 }],
    ['a negative position', { ...valid, position: -1 }],
    ['a fractional count', { ...valid, keystrokes: 6.5 }],
    ['a count given as text', { ...valid, position: '5' }],
    ['NaN', { ...valid, position: Number.NaN }],
    ['Infinity', { ...valid, keystrokes: Number.POSITIVE_INFINITY }],
    ['2^31', { ...valid, sequence: 2 ** 31 }],
    ['2^53', { ...valid, keystrokes: 2 ** 53 }],
  ])('rejects %s', (_label, json) => {
    expect(parseProgressReport(json)).toBeNull();
  });

  it('accepts the largest stored counter, 2^31 - 1', () => {
    expect(parseProgressReport({ ...valid, sequence: 2 ** 31 - 1 })).not.toBeNull();
  });
});

describe('judgeProgressReport', () => {
  it('accepts a consistent report with a newer sequence', () => {
    expect(judge(valid)).toBe('accepted');
  });

  it('accepts the whole passage typed at a humanly possible speed', () => {
    expect(judge({ sequence: 9, position: passageLength, keystrokes: 70, rejectedKeystrokes: 6 })).toBe('accepted');
  });

  it('refuses a sequence that is not newer than the last accepted one as stale', () => {
    const previous = { lastSequence: 4, position: 2, keystrokes: 2, rejectedKeystrokes: 0 };
    expect(judge({ ...valid, sequence: 4 }, previous)).toBe('stale');
    expect(judge({ ...valid, sequence: 3 }, previous)).toBe('stale');
  });

  it.each([
    ['a position beyond the passage', { sequence: 1, position: passageLength + 1, keystrokes: passageLength + 1, rejectedKeystrokes: 0 }],
    ['more characters than correct keystrokes', { sequence: 1, position: 5, keystrokes: 5, rejectedKeystrokes: 1 }],
    ['fewer characters than correct keystrokes', { sequence: 1, position: 4, keystrokes: 6, rejectedKeystrokes: 1 }],
    ['more rejected than total keystrokes', { sequence: 1, position: 0, keystrokes: 1, rejectedKeystrokes: 2 }],
  ])('refuses %s as implausible', (_label, report) => {
    expect(judge(report)).toBe('implausible');
  });

  it.each([
    ['a position moving back', { sequence: 5, position: 2, keystrokes: 4, rejectedKeystrokes: 2 }],
    ['keystrokes going down', { sequence: 5, position: 3, keystrokes: 3, rejectedKeystrokes: 0 }],
    ['rejected keystrokes going down', { sequence: 5, position: 4, keystrokes: 4, rejectedKeystrokes: 0 }],
  ])('refuses %s as implausible', (_label, report) => {
    const previous = { lastSequence: 4, position: 3, keystrokes: 4, rejectedKeystrokes: 1 };
    expect(judge(report, previous)).toBe('implausible');
  });

  it('caps the position cumulatively from the start, plus the burst allowance', () => {
    const elapsedMs = 1_000;
    const cap = maxCharactersPerSecond + progressBurstAllowance;
    expect(judge({ sequence: 1, position: cap, keystrokes: cap, rejectedKeystrokes: 0 }, untouched, elapsedMs)).toBe('accepted');
    expect(judge({ sequence: 1, position: cap + 1, keystrokes: cap + 1, rejectedKeystrokes: 0 }, untouched, elapsedMs)).toBe('implausible');
  });

  it('caps keystrokes cumulatively, so a flood of rejected keys is refused', () => {
    const elapsedMs = 1_000;
    const cap = maxKeystrokesPerSecond + progressBurstAllowance;
    expect(judge({ sequence: 1, position: 0, keystrokes: cap, rejectedKeystrokes: cap }, untouched, elapsedMs)).toBe('accepted');
    expect(judge({ sequence: 1, position: 0, keystrokes: cap + 1, rejectedKeystrokes: cap + 1 }, untouched, elapsedMs)).toBe('implausible');
  });

  it('refuses ten reports 20 ms apart adding 10 characters each once the cumulative cap is passed', () => {
    let previous = untouched;
    const judgements = Array.from({ length: 10 }, (_, index) => {
      const position = (index + 1) * 10;
      const report = { sequence: index + 1, position: Math.min(position, passageLength), keystrokes: Math.min(position, passageLength), rejectedKeystrokes: 0 };
      const judgement = judge(report, previous, (index + 1) * 20);
      if (judgement === 'accepted') previous = { lastSequence: report.sequence, position: report.position, keystrokes: report.keystrokes, rejectedKeystrokes: 0 };
      return judgement;
    });
    expect(judgements[0]).toBe('accepted');
    expect(judgements.slice(1).every((judgement) => judgement === 'implausible')).toBe(true);
    expect(previous.position).toBe(10);
  });

  it('at or before the start time, allows only the burst allowance', () => {
    expect(judge({ sequence: 1, position: 1, keystrokes: 1, rejectedKeystrokes: 0 }, untouched, -500)).toBe('accepted');
    expect(judge({ sequence: 1, position: progressBurstAllowance + 1, keystrokes: progressBurstAllowance + 1, rejectedKeystrokes: 0 }, untouched, 0)).toBe('implausible');
  });
});
