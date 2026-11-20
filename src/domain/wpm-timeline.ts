import { gameConfig } from '@/config/game';
import { isCount, isJsonObject } from './json-guards';
import { measureRacer } from './race-results';

// One point of a racer's WPM during the race: elapsedMs from the race start on the server clock, wpm the Annex A net WPM at that moment,
// rounded once to the whole number the results show, so the chart and its table never round it a second time.
export type TimelinePoint = { elapsedMs: number; wpm: number };

export type RacerWpmTimeline = { memberKey: string; points: TimelinePoint[] };

// unrecorded is a race settled before the server kept the samples (#147).
export type RaceWpmTimelines = { kind: 'recorded'; racers: RacerWpmTimeline[] } | { kind: 'unrecorded' };

// The moment of an accepted report and what the server had accepted before it; previousReportMs is null for the racer's first one.
export type AcceptedReportMoment = { previousReportMs: number | null; reportMs: number; previousCorrectCharacters: number };

// When the racer stopped (finish, abandonment, removal or race end) and the correct characters the results froze then.
export type RacerStop = { stopMs: number; correctCharacters: number };

// The samples already stored reach the previous accepted report; every sample ending before this report held what the server had accepted then.
// The time comes from the server clock and the count from accepted progress only, so a refused report never adds a sample.
export function samplesToAppend({ previousReportMs, reportMs, previousCorrectCharacters }: AcceptedReportMoment): number[] {
  const missingSamples = completedSamplesAt(reportMs) - completedSamplesAt(previousReportMs ?? 0);
  return Array<number>(Math.max(0, missingSamples)).fill(previousCorrectCharacters);
}

// After the last accepted report the count stayed where it was until the racer stopped, so the stored samples are completed with it.
export function completedSamples(samples: readonly number[], { stopMs, correctCharacters }: RacerStop): number[] {
  const sampleCount = completedSamplesAt(stopMs);
  const kept = samples.slice(0, sampleCount);
  return [...kept, ...Array<number>(sampleCount - kept.length).fill(correctCharacters)];
}

// One point per sample before the stop, then the stop itself, whose WPM is the one the results show.
export function timelinePoints(samples: readonly number[], stop: RacerStop): TimelinePoint[] {
  const { sampleMs } = gameConfig.wpmTimeline;
  const sampled = completedSamples(samples, stop).map((correctCharacters, index) => pointAt((index + 1) * sampleMs, correctCharacters));
  return [...sampled.filter((point) => point.elapsedMs < stop.stopMs), pointAt(stop.stopMs, stop.correctCharacters)];
}

export function parseStoredSamples(value: unknown): number[] | null {
  return Array.isArray(value) && value.every(isCount) ? value : null;
}

export function parseRaceWpmTimelines(json: unknown): RaceWpmTimelines | null {
  if (!isJsonObject(json)) return null;
  if (json.kind === 'unrecorded') return { kind: 'unrecorded' };
  if (json.kind !== 'recorded' || !Array.isArray(json.racers)) return null;
  const racers = json.racers.map(parseRacerTimeline);
  return racers.every((racer) => racer !== null) ? { kind: 'recorded', racers } : null;
}

function parseRacerTimeline(value: unknown): RacerWpmTimeline | null {
  if (!isJsonObject(value) || typeof value.memberKey !== 'string' || !Array.isArray(value.points)) return null;
  const points = value.points.map(parsePoint);
  return points.every((point) => point !== null) ? { memberKey: value.memberKey, points } : null;
}

function parsePoint(value: unknown): TimelinePoint | null {
  if (!isJsonObject(value) || !isCount(value.elapsedMs)) return null;
  const { wpm } = value;
  return typeof wpm === 'number' && Number.isFinite(wpm) && wpm >= 0 ? { elapsedMs: value.elapsedMs, wpm } : null;
}

function completedSamplesAt(elapsedMs: number): number {
  return Math.floor(Math.max(0, elapsedMs) / gameConfig.wpmTimeline.sampleMs);
}

function pointAt(elapsedMs: number, correctCharacters: number): TimelinePoint {
  const { grossWpm } = measureRacer({ typedCharacters: correctCharacters, keystrokes: correctCharacters, rejectedKeystrokes: 0, elapsedMs });
  return { elapsedMs, wpm: Math.round(grossWpm) };
}
