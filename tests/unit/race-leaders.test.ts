import { describe, expect, it } from 'vitest';
import { leadersWithViewer, placedRacers, rankRacers, viewerPlace } from '../../src/features/race/race-leaders';
import type { Racer } from '../../src/features/race/racers';

type RacerSetup = { position?: number; finishMs?: number | null; abandoned?: boolean; inactive?: boolean; isViewer?: boolean };

const passageLength = 100;

function racer(name: string, { position = 0, finishMs = null, abandoned = false, inactive = false, isViewer = false }: RacerSetup = {}): Racer {
  const isFinished = !abandoned && !inactive && (finishMs !== null || position >= passageLength);
  const progress = { position, finishMs, abandoned, inactive, lastProgressMs: 0, disconnected: false, abandonedOffline: false, lastSeenMs: 0 };
  return { memberKey: name, trainerName: name, hasAccount: false, isHost: false, isSpectator: false, isViewer, partner: null, profile: null, bot: null, avatarSeed: null, progress, textLength: passageLength, isFinished, isAbandoned: abandoned, isInactive: inactive };
}

const names = (racers: { trainerName: string }[]) => racers.map(({ trainerName }) => trainerName);

describe('rankRacers', () => {
  it('ranks racers by how far they are in the text', () => {
    expect(names(rankRacers([racer('Alex', { position: 10 }), racer('Zoe', { position: 40 }), racer('Nina', { position: 25 })]))).toEqual(['Zoe', 'Nina', 'Alex']);
  });

  it('ranks finishers first, by finish order, even when a later finisher reached the end too', () => {
    const ranked = rankRacers([
      racer('Alex', { position: 90 }),
      racer('Zoe', { position: 100, finishMs: 52_000 }),
      racer('Nina', { position: 100, finishMs: 48_000 }),
    ]);
    expect(names(ranked)).toEqual(['Nina', 'Zoe', 'Alex']);
  });

  it('puts a viewer who just finished locally after the finishers the server has timed', () => {
    expect(names(rankRacers([racer('Moi', { position: 100, isViewer: true }), racer('Zoe', { position: 100, finishMs: 50_000 })]))).toEqual(['Zoe', 'Moi']);
  });

  it('puts racers who abandoned last, whatever their position', () => {
    expect(names(rankRacers([racer('Alex', { position: 80, abandoned: true }), racer('Zoe', { position: 5 })]))).toEqual(['Zoe', 'Alex']);
  });

  it('puts racers removed as inactive after those still racing, ordered with the abandoners by position', () => {
    expect(names(rankRacers([racer('Alex', { position: 60, inactive: true }), racer('Zoe', { position: 5 }), racer('Nina', { position: 90, abandoned: true })]))).toEqual(['Zoe', 'Nina', 'Alex']);
  });

  it('keeps the join order between racers at the same position', () => {
    expect(names(rankRacers([racer('Alex'), racer('Zoe'), racer('Nina')]))).toEqual(['Alex', 'Zoe', 'Nina']);
  });
});

describe('leadersWithViewer', () => {
  const field = [racer('A', { position: 50 }), racer('B', { position: 40 }), racer('C', { position: 30 }), racer('D', { position: 20 })];

  it('shows the top three and adds the viewer with their place when outside them', () => {
    const leaders = leadersWithViewer([...field, racer('Moi', { position: 10, isViewer: true })], 3);
    expect(leaders.map(({ racer: { trainerName }, place }) => [trainerName, place])).toEqual([['A', 1], ['B', 2], ['C', 3], ['Moi', 5]]);
  });

  it('shows only three markers when the viewer is in the top three', () => {
    const leaders = leadersWithViewer([...field, racer('Moi', { position: 45, isViewer: true })], 3);
    expect(leaders.map(({ racer: { trainerName }, place }) => [trainerName, place])).toEqual([['A', 1], ['Moi', 2], ['B', 3]]);
  });

  it('shows everyone in a race of two', () => {
    expect(leadersWithViewer([racer('Moi', { isViewer: true }), racer('Zoe', { position: 3 })], 3)).toHaveLength(2);
  });
});

describe('placedRacers', () => {
  it('gives every racer, not only the leaders, a place in ranking order', () => {
    const placed = placedRacers([racer('Alex', { position: 10 }), racer('Zoe', { position: 40 }), racer('Nina', { position: 25 })]);
    expect(placed.map(({ racer: { trainerName }, place }) => `${place}:${trainerName}`)).toEqual(['1:Zoe', '2:Nina', '3:Alex']);
  });
});

describe('viewerPlace', () => {
  it('gives the viewer place out of every racer, matching the roster order', () => {
    const racers = [racer('Alex', { position: 40 }), racer('Zoe', { position: 25, isViewer: true }), racer('Nina', { position: 10 })];
    expect(viewerPlace(racers)).toEqual({ place: 2, total: 3 });
  });

  it('has no place without a viewer racer', () => {
    expect(viewerPlace([racer('Alex', { position: 40 })])).toBeNull();
  });

  it('keeps the join-order place for tied racers on every recompute, so a tie never flickers', () => {
    const racers = [racer('Alex'), racer('Zoe', { isViewer: true }), racer('Nina')];
    const places = Array.from({ length: 5 }, () => viewerPlace(racers));
    expect(places).toEqual(Array.from({ length: 5 }, () => ({ place: 2, total: 3 })));
  });

  it('keeps a finished viewer place when a slower racer finishes after them', () => {
    const viewer = racer('Zoe', { position: 100, finishMs: 40_000, isViewer: true });
    expect(viewerPlace([racer('Alex', { position: 90 }), viewer])).toEqual({ place: 1, total: 2 });
    expect(viewerPlace([racer('Alex', { position: 100, finishMs: 45_000 }), viewer])).toEqual({ place: 1, total: 2 });
  });

  it('moves a viewer who abandons to the last place, as the roster does', () => {
    const racers = [racer('Alex', { position: 10 }), racer('Zoe', { position: 50, abandoned: true, isViewer: true }), racer('Nina', { position: 5 })];
    expect(viewerPlace(racers)).toEqual({ place: 3, total: 3 });
  });
});
