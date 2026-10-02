import { describe, expect, it } from 'vitest';
import type { XpReward } from '../../src/domain/xp-reward';
import { xpRewardFrames } from '../../src/features/race/xp-reward-frames';

function reward(before: XpReward['before'], after: XpReward['after'], xp = 150): XpReward {
  return { xp, before, after };
}

describe('the XP reward reveal', () => {
  it('fills the bar from the old XP to the new one within a level', () => {
    const frames = xpRewardFrames(reward({ species: 'squirtle', level: 1, xp: 0 }, { species: 'squirtle', level: 1, xp: 30 }, 30));
    expect(frames.map(({ ratio, fills }) => [ratio, fills])).toEqual([[0, false], [0.5, true]]);
  });

  it('fills to the end, shows each level reached, then continues from an empty bar', () => {
    const frames = xpRewardFrames(reward({ species: 'charmander', level: 1, xp: 0 }, { species: 'charmander', level: 3, xp: 20 }));
    expect(frames.map(({ level, ratio, reachedLevel }) => [level, ratio, reachedLevel])).toEqual([
      [1, 0, null],
      [1, 1, null],
      [2, 1, 2],
      [2, 0, 2],
      [2, 1, 2],
      [3, 1, 3],
      [3, 0, 3],
      [3, 0.25, 3],
    ]);
  });

  it('ends on a full bar at the maximum level', () => {
    const frames = xpRewardFrames(reward({ species: 'pikachu', level: 49, xp: 500 }, { species: 'pikachu', level: 50, xp: 0 }));
    expect(frames.at(-1)).toMatchObject({ level: 50, ratio: 1, reachedLevel: 50 });
  });

  it('ends with the old form flashing, then the new form', () => {
    const frames = xpRewardFrames(reward({ species: 'bulbasaur', level: 15, xp: 150 }, { species: 'ivysaur', level: 16, xp: 100 }));
    expect(frames.slice(-2).map(({ species, evolution }) => [species, evolution])).toEqual([
      ['bulbasaur', 'evolving'],
      ['ivysaur', 'evolved'],
    ]);
  });

  it('shows 0 XP without moving the bar', () => {
    const frames = xpRewardFrames(reward({ species: 'squirtle', level: 5, xp: 20 }, { species: 'squirtle', level: 5, xp: 20 }, 0));
    expect(frames.at(-1)).toMatchObject({ level: 5, ratio: 0.2, reachedLevel: null, evolution: 'none' });
  });
});
