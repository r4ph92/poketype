import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import { canShowProgression, oldestFirst, type WpmPoint } from '../../src/domain/profile-stats';
import { noRaceRecord, profileStatsOf } from '../../src/server/trainer/race-record';
import { toWpmPoint } from '../../src/server/trainer/profile-stats';

function point(day: number, wpm: number): WpmPoint {
  return { raceId: `race-${day}`, endedAt: new Date(Date.UTC(2026, 10, day)), wpm };
}

describe('profile statistics', () => {
  it('shows the races, wins, best and average WPM and accuracy of the record, without its badge counters', () => {
    const record = { races: 10, wins: 3, bestWpm: 48.4, averageWpm: 31.2, accuracy: 0.93, finishedRaces: 9, accurateRaces: 4 };
    expect(profileStatsOf(record)).toEqual({ races: 10, wins: 3, bestWpm: 48.4, averageWpm: 31.2, accuracy: 0.93 });
  });

  it('shows no best WPM, average or accuracy before a first ranked race', () => {
    expect(profileStatsOf(noRaceRecord)).toEqual({ races: 0, wins: 0, bestWpm: null, averageWpm: null, accuracy: null });
  });
});

describe('WPM progression', () => {
  it('puts the newest-first query rows in date order for the chart', () => {
    const newestFirst = [point(12, 40), point(11, 35), point(10, 30)];
    expect(oldestFirst(newestFirst).map((entry) => entry.raceId)).toEqual(['race-10', 'race-11', 'race-12']);
    expect(newestFirst[0]!.raceId).toBe('race-12');
  });

  it.each([
    [0, false],
    [1, false],
    [2, true],
    [10, true],
  ])('with %i ranked races, the chart shows: %s', (count, shown) => {
    expect(gameConfig.profile.minimumChartRaces).toBe(2);
    expect(canShowProgression(Array.from({ length: count }, (_, index) => point(index + 1, 30)))).toBe(shown);
  });

  it('refuses a chart row without an end time or a WPM', () => {
    const endedAt = new Date();
    expect(toWpmPoint({ raceId: 'a', endedAt, wpm: 42 })).toEqual({ raceId: 'a', endedAt, wpm: 42 });
    expect(() => toWpmPoint({ raceId: 'b', endedAt: null, wpm: 42 })).toThrow('Race b');
    expect(() => toWpmPoint({ raceId: 'c', endedAt, wpm: null })).toThrow('Race c');
  });
});
