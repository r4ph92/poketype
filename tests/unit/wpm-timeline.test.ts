import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import { judgeProgressReport, type AcceptedProgress, type ProgressReport } from '../../src/domain/progress-report';
import { measureRacer } from '../../src/domain/race-results';
import { completedSamples, parseRaceWpmTimelines, parseStoredSamples, samplesToAppend, timelinePoints } from '../../src/domain/wpm-timeline';

const { sampleMs } = gameConfig.wpmTimeline;
const passageLength = 200;

type ServerReport = { report: ProgressReport; reportMs: number };

type StoredRacer = { accepted: AcceptedProgress; lastReportMs: number | null; samples: number[] };

const untouched: StoredRacer = { accepted: { lastSequence: 0, position: 0, correctCharacters: 0, keystrokes: 0, rejectedKeystrokes: 0 }, lastReportMs: null, samples: [] };

function typed(sequence: number, position: number): ProgressReport {
  return { sequence, position, correctCharacters: position, keystrokes: position, rejectedKeystrokes: 0 };
}

// Mirrors the report command: only a report the judge accepts appends samples and becomes the stored progress.
function storeReports(reports: readonly ServerReport[]): StoredRacer {
  return reports.reduce((stored, { report, reportMs }) => {
    const judgement = judgeProgressReport({ previous: stored.accepted, report, passageLength, elapsedSinceStartMs: reportMs, errorMode: 'blocked' });
    if (judgement !== 'accepted') return stored;
    const appended = samplesToAppend({ previousReportMs: stored.lastReportMs, reportMs, previousCorrectCharacters: stored.accepted.correctCharacters });
    return { accepted: { ...report, lastSequence: report.sequence }, lastReportMs: reportMs, samples: [...stored.samples, ...appended] };
  }, untouched);
}

function wpmAt(correctCharacters: number, elapsedMs: number): number {
  return Math.round(measureRacer({ typedCharacters: correctCharacters, keystrokes: correctCharacters, rejectedKeystrokes: 0, elapsedMs }).grossWpm * 10) / 10;
}

describe('samplesToAppend', () => {
  it('fills every whole second since the previous accepted report with the progress accepted before them', () => {
    expect(samplesToAppend({ previousReportMs: null, reportMs: 2_500, previousCorrectCharacters: 0 })).toEqual([0, 0]);
    expect(samplesToAppend({ previousReportMs: 2_500, reportMs: 3_200, previousCorrectCharacters: 9 })).toEqual([9]);
    expect(samplesToAppend({ previousReportMs: 3_200, reportMs: 8_000, previousCorrectCharacters: 12 })).toEqual([12, 12, 12, 12, 12]);
  });

  it('adds nothing for a report inside a second already sampled or before the start', () => {
    expect(samplesToAppend({ previousReportMs: 3_200, reportMs: 3_900, previousCorrectCharacters: 12 })).toEqual([]);
    expect(samplesToAppend({ previousReportMs: null, reportMs: -200, previousCorrectCharacters: 0 })).toEqual([]);
  });
});

describe('the stored samples of a race', () => {
  const reports: ServerReport[] = [
    { report: typed(1, 4), reportMs: 750 },
    { report: typed(2, 9), reportMs: 1_500 },
    { report: typed(3, 150), reportMs: 1_750 },
    { report: typed(4, 14), reportMs: 2_250 },
    { report: typed(5, 20), reportMs: 7_100 },
  ];

  it('come only from accepted progress: a forged jump the judge refuses never enters them', () => {
    const stored = storeReports(reports);
    expect(stored.accepted.correctCharacters).toBe(20);
    expect(stored.samples).toEqual([4, 9, 14, 14, 14, 14, 14]);
    expect(stored.samples).not.toContain(150);
  });

  it('are a plain array of correct-character counts, index 0 for the first second, that survives the jsonb column', () => {
    const stored = storeReports(reports);
    expect(parseStoredSamples(JSON.parse(JSON.stringify(stored.samples)))).toEqual(stored.samples);
    expect(stored.samples).toHaveLength(Math.floor(7_100 / sampleMs));
  });

  it('give at least one point per second of the racer\'s race, in increasing time, ending on the stop', () => {
    const stored = storeReports(reports);
    const stop = { stopMs: 11_400, correctCharacters: stored.accepted.correctCharacters };
    const points = timelinePoints(stored.samples, stop);
    expect(points.map((point) => point.elapsedMs)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((second) => second * sampleMs).concat(11_400));
    expect(points.length).toBeGreaterThanOrEqual(Math.floor(stop.stopMs / sampleMs));
    expect(points.at(-1)).toEqual({ elapsedMs: 11_400, wpm: wpmAt(20, 11_400) });
  });

  it('compute each point with the Annex A formula of the results', () => {
    const points = timelinePoints([4, 14], { stopMs: 2_600, correctCharacters: 18 });
    expect(points).toEqual([{ elapsedMs: 1_000, wpm: wpmAt(4, 1_000) }, { elapsedMs: 2_000, wpm: wpmAt(14, 2_000) }, { elapsedMs: 2_600, wpm: wpmAt(18, 2_600) }]);
  });
});

describe('completedSamples', () => {
  it('holds the last accepted count from the last report until the stop', () => {
    expect(completedSamples([3, 8], { stopMs: 5_200, correctCharacters: 11 })).toEqual([3, 8, 11, 11, 11]);
  });

  it('keeps no sample after the stop', () => {
    expect(completedSamples([3, 8, 11], { stopMs: 2_000, correctCharacters: 11 })).toEqual([3, 8]);
  });

  it('replaces the sample at a stop on a whole second by the stop itself', () => {
    expect(timelinePoints([3, 8], { stopMs: 2_000, correctCharacters: 11 }).map((point) => point.elapsedMs)).toEqual([1_000, 2_000]);
    expect(timelinePoints([3, 8], { stopMs: 2_000, correctCharacters: 11 }).at(-1)?.wpm).toBe(wpmAt(11, 2_000));
  });
});

describe('parseStoredSamples', () => {
  it.each([['null', null], ['an object', {}], ['a negative count', [1, -1]], ['a fraction', [1.5]], ['text', ['3']]])('reads %s as not recorded', (_label, value) => {
    expect(parseStoredSamples(value)).toBeNull();
  });
});

describe('parseRaceWpmTimelines', () => {
  const recorded = { kind: 'recorded', racers: [{ memberKey: 'zoe', points: [{ elapsedMs: 1_000, wpm: 42.5 }] }] };

  it('reads recorded and unrecorded timelines', () => {
    expect(parseRaceWpmTimelines(recorded)).toEqual(recorded);
    expect(parseRaceWpmTimelines({ kind: 'unrecorded' })).toEqual({ kind: 'unrecorded' });
  });

  it.each([
    ['an unknown kind', { kind: 'live' }],
    ['racers that are not a list', { kind: 'recorded', racers: {} }],
    ['a racer without a key', { kind: 'recorded', racers: [{ points: [] }] }],
    ['a negative time', { kind: 'recorded', racers: [{ memberKey: 'zoe', points: [{ elapsedMs: -1, wpm: 3 }] }] }],
    ['an infinite WPM', { kind: 'recorded', racers: [{ memberKey: 'zoe', points: [{ elapsedMs: 1, wpm: Number.POSITIVE_INFINITY }] }] }],
  ])('rejects %s', (_label, json) => {
    expect(parseRaceWpmTimelines(json)).toBeNull();
  });
});
