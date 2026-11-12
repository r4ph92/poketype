import { gameConfig } from '@/config/game';

// Identifies the scoring and ranking code stored with each settled race: changing charactersPerWord, the clamp, a formula or the ranking order below bumps it.
// Version 2 (#136) ranks by outcome and gives abandoners a place; races settled under version 1 keep their stored places.
export const raceRulesVersion = 2;

// typedCharacters is the accepted position; elapsedMs is measured from the race start on the server clock.
export type RacerPerformance = { typedCharacters: number; keystrokes: number; rejectedKeystrokes: number; elapsedMs: number };

// In blocked mode every rejected keystroke is a penalizable error (H3).
export type RacerMetrics = { grossWpm: number; score: number; accuracy: number; errors: number };

// How a racer's race ended: crossing the finish, stopped by the race end before finishing, leaving, or removed by the host after a minute without typing.
export type RaceOutcome = 'finished' | 'timedOut' | 'abandoned' | 'inactive';

const raceOutcomes: readonly RaceOutcome[] = ['finished', 'timedOut', 'abandoned', 'inactive'];

export function isRaceOutcome(value: unknown): value is RaceOutcome {
  return raceOutcomes.some((outcome) => outcome === value);
}

export type RankedRacer = { outcome: RaceOutcome; performance: RacerPerformance };

export type Placed<Racer> = Racer & { place: number };

const millisecondsPerMinute = 60_000;

export function measureRacer(performance: RacerPerformance): RacerMetrics {
  const minutes = scoredElapsedMs(performance) / millisecondsPerMinute;
  const errors = performance.rejectedKeystrokes;
  const grossWpm = performance.typedCharacters / gameConfig.scoring.charactersPerWord / minutes;
  return { grossWpm, score: Math.max(0, grossWpm - errors / minutes), accuracy: accuracyOf(performance), errors };
}

// COURSE-10: finishers by arrival, then racers the race end stopped, then abandoners (a racer removed as inactive counts as one), the last two by progress.
// Competition ranking: equal racers share a place and the next place skips (1, 1, 3). Speed and accuracy never change the order.
export function placeRacers<Racer extends RankedRacer>(racers: readonly Racer[]): Placed<Racer>[] {
  const ranked = [...racers].sort(compareRacers);
  return ranked.map((racer) => ({ ...racer, place: 1 + countRacersAhead(ranked, racer) }));
}

// Negative when the first racer ranks ahead.
export function compareRacers(first: RankedRacer, second: RankedRacer): number {
  const byOutcome = outcomeTier[first.outcome] - outcomeTier[second.outcome];
  if (byOutcome !== 0) return byOutcome;
  if (first.outcome === 'finished') return Math.sign(first.performance.elapsedMs - second.performance.elapsedMs);
  return Math.sign(second.performance.typedCharacters - first.performance.typedCharacters);
}

export function isAbandonment(outcome: RaceOutcome): boolean {
  return outcomeTier[outcome] === outcomeTier.abandoned;
}

const outcomeTier: Record<RaceOutcome, number> = { finished: 0, timedOut: 1, abandoned: 2, inactive: 2 };

function countRacersAhead<Racer extends RankedRacer>(ranked: readonly Racer[], racer: Racer): number {
  return ranked.filter((other) => compareRacers(other, racer) < 0).length;
}

function scoredElapsedMs({ elapsedMs }: RacerPerformance): number {
  return Math.max(elapsedMs, gameConfig.scoring.minimumElapsedMs);
}

// No keystroke at all scores 0 % rather than dividing by zero.
function accuracyOf({ keystrokes, rejectedKeystrokes }: RacerPerformance): number {
  return keystrokes === 0 ? 0 : (keystrokes - rejectedKeystrokes) / keystrokes;
}
