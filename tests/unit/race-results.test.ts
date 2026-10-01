import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import { compareRacers, measureRacer, placeRacers, type RacerPerformance } from '../../src/domain/race-results';

function performance(typedCharacters: number, elapsedMs: number, rejectedKeystrokes = 0): RacerPerformance {
  return { typedCharacters, keystrokes: typedCharacters + rejectedKeystrokes, rejectedKeystrokes, elapsedMs };
}

function racer(name: string, measured: RacerPerformance) {
  return { name, performance: measured };
}

function placesOf(racers: ReturnType<typeof racer>[]): [string, number][] {
  return placeRacers(racers).map(({ name, place }) => [name, place]);
}

describe('measureRacer (H3)', () => {
  it('Zoe: 50 characters in 30 seconds with 2 rejected keystrokes gives 20 WPM, 96 % accuracy, 2 errors and a score of 16', () => {
    const metrics = measureRacer(performance(50, 30_000, 2));

    expect(metrics.grossWpm).toBeCloseTo(20, 10);
    expect(metrics.accuracy).toBeCloseTo(50 / 52, 10);
    expect(Math.round(metrics.accuracy * 100)).toBe(96);
    expect(metrics.errors).toBe(2);
    expect(metrics.score).toBeCloseTo(16, 10);
  });

  it('a clean run scores its gross WPM and 100 % accuracy', () => {
    const metrics = measureRacer(performance(64, 60_000));

    expect(metrics.grossWpm).toBeCloseTo(12.8, 10);
    expect(metrics.score).toBeCloseTo(12.8, 10);
    expect(metrics.accuracy).toBe(1);
  });

  it('the score never goes below zero', () => {
    expect(measureRacer(performance(10, 60_000, 50)).score).toBe(0);
  });

  it('a finish inside the burst allowance is measured over the minimum time, never divided by zero', () => {
    const atZero = measureRacer(performance(10, 0));
    const atMinimum = measureRacer(performance(10, gameConfig.scoring.minimumElapsedMs));

    expect(atZero).toEqual(atMinimum);
    expect(Number.isFinite(atZero.grossWpm)).toBe(true);
  });

  it('no keystroke at all scores 0 % accuracy', () => {
    expect(measureRacer({ typedCharacters: 0, keystrokes: 0, rejectedKeystrokes: 0, elapsedMs: 30_000 }).accuracy).toBe(0);
  });
});

describe('placeRacers (H3: score, then accuracy, then finish time)', () => {
  it('a higher score beats a higher WPM', () => {
    const zoe = racer('Zoé', performance(50, 30_000, 2));
    const alex = racer('Alex', performance(50, 25_000, 6));

    expect(measureRacer(alex.performance).grossWpm).toBeGreaterThan(measureRacer(zoe.performance).grossWpm);
    expect(placesOf([alex, zoe])).toEqual([
      ['Zoé', 1],
      ['Alex', 2],
    ]);
  });

  it('an exactly equal score is decided by accuracy, even when the floating-point scores differ', () => {
    const clean = racer('Alex', performance(64, 22_400));
    const sloppy = racer('Zoé', performance(64, 20_650, 1));

    expect(measureRacer(sloppy.performance).score).toBeGreaterThan(measureRacer(clean.performance).score);
    expect(placesOf([sloppy, clean])).toEqual([
      ['Alex', 1],
      ['Zoé', 2],
    ]);
  });

  it('equal score and accuracy are decided by the earlier finish', () => {
    const later = racer('Alex', performance(10, 30_000, 2));
    const earlier = racer('Zoé', performance(10, 20_000, 2));

    expect(placesOf([later, earlier])).toEqual([
      ['Zoé', 1],
      ['Alex', 2],
    ]);
  });

  it('racers equal on all three share a place and the next place skips', () => {
    const first = racer('Alex', performance(64, 30_000, 1));
    const second = racer('Zoé', performance(64, 30_000, 1));
    const third = racer('Nina', performance(64, 40_000, 1));

    expect(placesOf([third, first, second]).map(([, place]) => place)).toEqual([1, 1, 3]);
  });

  it('compares racers in both directions consistently', () => {
    const faster = performance(64, 20_000);
    const slower = performance(64, 30_000);

    expect(compareRacers(faster, slower)).toBeLessThan(0);
    expect(compareRacers(slower, faster)).toBeGreaterThan(0);
    expect(compareRacers(faster, faster)).toBe(0);
  });
});
