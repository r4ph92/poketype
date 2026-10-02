import { describe, expect, it } from 'vitest';
import { leadersWithViewer, rankRacers } from '../../src/features/race/race-leaders';
import type { Racer } from '../../src/features/race/racers';

type RacerSetup = { position?: number; finishMs?: number | null; abandoned?: boolean; isViewer?: boolean };

const passageLength = 100;

function racer(name: string, { position = 0, finishMs = null, abandoned = false, isViewer = false }: RacerSetup = {}): Racer {
  const isFinished = !abandoned && (finishMs !== null || position >= passageLength);
  return { memberKey: name, trainerName: name, hasAccount: false, isHost: false, isViewer, progress: { position, finishMs, abandoned }, isFinished, isAbandoned: abandoned };
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
