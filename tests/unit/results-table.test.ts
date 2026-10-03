import { createFormatter } from 'next-intl';
import { describe, expect, it } from 'vitest';
import type { RaceResultRow, RoomMemberView } from '../../src/domain/room-view';
import { formatFinishSeconds, wholePercent } from '../../src/features/race/race-number-format';
import { isRanked, resultsTableRows } from '../../src/features/race/results-table';

const members: RoomMemberView[] = [
  { memberKey: 'a', trainerName: 'Alex', hasAccount: false, isHost: true, isViewer: true, partner: 'charmander', profile: null, progress: { position: 50, finishMs: 25_000, abandoned: false, inactive: false, lastProgressMs: 0 }, bot: null },
  { memberKey: 'z', trainerName: 'Zoé', hasAccount: false, isHost: false, isViewer: false, partner: null, profile: null, progress: { position: 50, finishMs: 30_000, abandoned: false, inactive: false, lastProgressMs: 0 }, bot: null },
  { memberKey: 'n', trainerName: 'Nina', hasAccount: true, isHost: false, isViewer: false, partner: null, profile: null, progress: { position: 50, finishMs: 30_000, abandoned: false, inactive: false, lastProgressMs: 0 }, bot: null },
];

function result(memberKey: string, place: number): RaceResultRow {
  return { memberKey, standing: 'ranked', place, grossWpm: 20, score: 16, accuracy: 50 / 52, errors: 2, finishMs: 30_000 };
}

describe('resultsTableRows', () => {
  it('lists racers by place with their trainer name and the viewer marked', () => {
    const rows = resultsTableRows([result('a', 2), result('z', 1)], members.slice(0, 2));

    expect(rows.filter(isRanked).map(({ trainerName, place, isViewer }) => ({ trainerName, place, isViewer }))).toEqual([
      { trainerName: 'Zoé', place: 1, isViewer: false },
      { trainerName: 'Alex', place: 2, isViewer: true },
    ]);
  });

  it('orders racers sharing a place by name, the same way on every page', () => {
    const rows = resultsTableRows([result('z', 1), result('a', 3), result('n', 1)], members);

    expect(rows.map((row) => row.trainerName)).toEqual(['Nina', 'Zoé', 'Alex']);
  });

  it('lists a racer who abandoned after every ranked racer, without a place', () => {
    const abandoned: RaceResultRow = { memberKey: 'a', standing: 'abandoned', errors: 1 };
    const rows = resultsTableRows([abandoned, result('z', 1), result('n', 2)], members);

    expect(rows.map((row) => row.trainerName)).toEqual(['Zoé', 'Nina', 'Alex']);
    expect(rows.map(isRanked)).toEqual([true, true, false]);
  });

  it('lists a racer removed as inactive after every ranked racer, without a place', () => {
    const inactive: RaceResultRow = { memberKey: 'z', standing: 'inactive', errors: 0 };
    const rows = resultsTableRows([inactive, result('a', 1), result('n', 2)], members);

    expect(rows.map((row) => row.trainerName)).toEqual(['Alex', 'Nina', 'Zoé']);
    expect(rows.map(isRanked)).toEqual([true, true, false]);
  });

  it('drops a result without a matching member rather than showing a nameless row', () => {
    expect(resultsTableRows([result('z', 1), result('ghost', 2)], members)).toHaveLength(1);
  });
});

describe('race number formatting', () => {

  it('rounds accuracy to a whole percent for display', () => {
    expect(wholePercent(50 / 52)).toBe(96);
    expect(wholePercent(1)).toBe(100);
  });

  it('shows the finish time with one decimal in the locale format', () => {
    expect(formatFinishSeconds(createFormatter({ locale: 'fr' }), 30_000)).toBe('30,0');
    expect(formatFinishSeconds(createFormatter({ locale: 'en' }), 22_450)).toBe('22.5');
  });
});
