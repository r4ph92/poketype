import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import { compareRacers, measureRacer, placeRacers, type RaceOutcome, type RacerPerformance } from '../../src/domain/race-results';

function performance(typedCharacters: number, elapsedMs: number, rejectedKeystrokes = 0): RacerPerformance {
  return { typedCharacters, keystrokes: typedCharacters + rejectedKeystrokes, rejectedKeystrokes, elapsedMs };
}

function racer(name: string, outcome: RaceOutcome, measured: RacerPerformance) {
  return { name, outcome, performance: measured };
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

describe('placeRacers (COURSE-10: finishers by arrival, then the clock, then abandoners)', () => {
  it('Leo finishing in 35 s beats Zoe finishing in 40 s, whatever their WPM or accuracy', () => {
    const leo = racer('Leo', 'finished', performance(100, 35_000, 9));
    const zoe = racer('Zoé', 'finished', performance(400, 40_000));

    expect(measureRacer(zoe.performance).grossWpm).toBeGreaterThan(measureRacer(leo.performance).grossWpm);
    expect(measureRacer(zoe.performance).accuracy).toBeGreaterThan(measureRacer(leo.performance).accuracy);
    expect(placesOf([zoe, leo])).toEqual([
      ['Leo', 1],
      ['Zoé', 2],
    ]);
  });

  it('racers the clock stopped rank after every finisher, by progress', () => {
    const nina = racer('Nina', 'timedOut', performance(320, 120_000));
    const bot = racer('Bot', 'timedOut', performance(240, 120_000));
    const slowFinisher = racer('Leo', 'finished', performance(400, 119_000, 20));

    expect(placesOf([bot, nina, slowFinisher])).toEqual([
      ['Leo', 1],
      ['Nina', 2],
      ['Bot', 3],
    ]);
  });

  it('abandoners rank last, by progress, behind racers the clock stopped', () => {
    const maya = racer('Maya', 'abandoned', performance(280, 20_000));
    const leo = racer('Leo', 'abandoned', performance(120, 10_000));
    const nina = racer('Nina', 'timedOut', performance(40, 120_000));

    expect(placesOf([leo, maya, nina])).toEqual([
      ['Nina', 1],
      ['Maya', 2],
      ['Leo', 3],
    ]);
  });

  it('a racer removed as inactive ranks as an abandoner at their progress', () => {
    const removed = racer('Zoé', 'inactive', performance(200, 70_000));
    const abandoned = racer('Maya', 'abandoned', performance(100, 20_000));
    const timedOut = racer('Nina', 'timedOut', performance(10, 120_000));

    expect(placesOf([abandoned, removed, timedOut])).toEqual([
      ['Nina', 1],
      ['Zoé', 2],
      ['Maya', 3],
    ]);
  });

  it('two racers finishing at the same millisecond share a place and the next place skips', () => {
    const alex = racer('Alex', 'finished', performance(400, 30_000, 4));
    const zoe = racer('Zoé', 'finished', performance(400, 30_000));
    const nina = racer('Nina', 'finished', performance(400, 31_000));

    expect(placesOf([nina, alex, zoe]).map(([, place]) => place)).toEqual([1, 1, 3]);
  });

  it('racers stopped at the same progress share a place', () => {
    const nina = racer('Nina', 'timedOut', performance(200, 120_000, 3));
    const bot = racer('Bot', 'timedOut', performance(200, 120_000));

    expect(placesOf([nina, bot]).map(([, place]) => place)).toEqual([1, 1]);
  });

  it('compares racers in both directions consistently', () => {
    const faster = racer('Alex', 'finished', performance(64, 20_000));
    const slower = racer('Zoé', 'finished', performance(64, 30_000));
    const stopped = racer('Nina', 'timedOut', performance(60, 10_000));

    expect(compareRacers(faster, slower)).toBeLessThan(0);
    expect(compareRacers(slower, faster)).toBeGreaterThan(0);
    expect(compareRacers(faster, faster)).toBe(0);
    expect(compareRacers(slower, stopped)).toBeLessThan(0);
    expect(compareRacers(stopped, slower)).toBeGreaterThan(0);
  });
});
