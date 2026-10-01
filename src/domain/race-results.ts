import { gameConfig } from '@/config/game';

// Identifies the scoring code stored with each settled race: changing charactersPerWord, the clamp or a formula below bumps it.
export const raceRulesVersion = 1;

// typedCharacters is the accepted position; elapsedMs is measured from the race start on the server clock.
export type RacerPerformance = { typedCharacters: number; keystrokes: number; rejectedKeystrokes: number; elapsedMs: number };

// In blocked mode every rejected keystroke is a penalizable error (H3).
export type RacerMetrics = { grossWpm: number; score: number; accuracy: number; errors: number };

export type RankedRacer = { performance: RacerPerformance };

export type Placed<Racer> = Racer & { place: number };

const millisecondsPerMinute = 60_000;

export function measureRacer(performance: RacerPerformance): RacerMetrics {
  const minutes = scoredElapsedMs(performance) / millisecondsPerMinute;
  const errors = performance.rejectedKeystrokes;
  const grossWpm = performance.typedCharacters / gameConfig.scoring.charactersPerWord / minutes;
  return { grossWpm, score: Math.max(0, grossWpm - errors / minutes), accuracy: accuracyOf(performance), errors };
}

// Competition ranking: racers equal on score, accuracy and finish time share a place, and the next place skips (1, 1, 3).
export function placeRacers<Racer extends RankedRacer>(racers: readonly Racer[]): Placed<Racer>[] {
  const ranked = [...racers].sort((first, second) => compareRacers(first.performance, second.performance));
  return ranked.map((racer) => ({ ...racer, place: 1 + countRacersAhead(ranked, racer) }));
}

// Negative when the first racer ranks ahead: score, then accuracy, then the earlier finish (H3).
export function compareRacers(first: RacerPerformance, second: RacerPerformance): number {
  return compareScores(first, second) || compareAccuracies(first, second) || Math.sign(first.elapsedMs - second.elapsedMs);
}

function countRacersAhead(ranked: readonly RankedRacer[], racer: RankedRacer): number {
  return ranked.filter((other) => compareRacers(other.performance, racer.performance) < 0).length;
}

function compareScores(first: RacerPerformance, second: RacerPerformance): number {
  return higherFirst(scoreFraction(first), scoreFraction(second));
}

function compareAccuracies(first: RacerPerformance, second: RacerPerformance): number {
  return higherFirst(accuracyFraction(first), accuracyFraction(second));
}

type Fraction = { numerator: bigint; denominator: bigint };

// Cross-multiplied integers compare exactly, so two racers with the same true score never split on a rounding error.
function higherFirst(first: Fraction, second: Fraction): number {
  const difference = second.numerator * first.denominator - first.numerator * second.denominator;
  if (difference > 0n) return 1;
  return difference < 0n ? -1 : 0;
}

// The score is proportional to max(0, characters − charactersPerWord × errors) / elapsed time.
function scoreFraction(performance: RacerPerformance): Fraction {
  return { numerator: scoredCharacters(performance), denominator: BigInt(scoredElapsedMs(performance)) };
}

function scoredCharacters({ typedCharacters, rejectedKeystrokes }: RacerPerformance): bigint {
  const characters = BigInt(typedCharacters) - BigInt(gameConfig.scoring.charactersPerWord) * BigInt(rejectedKeystrokes);
  return characters > 0n ? characters : 0n;
}

function scoredElapsedMs({ elapsedMs }: RacerPerformance): number {
  return Math.max(elapsedMs, gameConfig.scoring.minimumElapsedMs);
}

// No keystroke at all scores 0 % rather than dividing by zero.
function accuracyFraction({ keystrokes, rejectedKeystrokes }: RacerPerformance): Fraction {
  if (keystrokes === 0) return { numerator: 0n, denominator: 1n };
  return { numerator: BigInt(keystrokes - rejectedKeystrokes), denominator: BigInt(keystrokes) };
}

function accuracyOf(performance: RacerPerformance): number {
  const { numerator, denominator } = accuracyFraction(performance);
  return Number(numerator) / Number(denominator);
}
