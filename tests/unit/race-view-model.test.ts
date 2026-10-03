import { describe, expect, it } from 'vitest';
import { passageCharacters } from '../../src/domain/passage';
import type { RoomMemberView } from '../../src/domain/room-view';
import { splitPassage } from '../../src/features/race/passage-segments';
import { racersWithLocalViewer, reachedMilestone } from '../../src/features/race/racers';

const characters = passageCharacters('Le ç.');

describe('passage segments', () => {
  it('splits the passage into typed, current and upcoming parts', () => {
    expect(splitPassage(characters, 3, false)).toEqual({ typed: 'Le ', current: 'ç', upcoming: '.' });
  });

  it('shows a wrong space as a middle dot and any other wrong character as itself', () => {
    expect(splitPassage(characters, 2, true).current).toBe('·');
    expect(splitPassage(characters, 3, true).current).toBe('ç');
    expect(splitPassage(characters, 2, false).current).toBe(' ');
  });

  it('has no current character once the passage is typed', () => {
    expect(splitPassage(characters, 5, false)).toEqual({ typed: 'Le ç.', current: null, upcoming: '' });
  });
});

describe('racers', () => {
  const members: RoomMemberView[] = [
    { memberKey: 'a', trainerName: 'Alex', hasAccount: false, isHost: true, isViewer: false, partner: 'bulbasaur', profile: null, progress: { position: 5, finishMs: null, abandoned: false, inactive: false, lastProgressMs: 0 }, bot: null },
    { memberKey: 'z', trainerName: 'Zoé', hasAccount: true, isHost: false, isViewer: true, partner: null, profile: null, progress: { position: 1, finishMs: null, abandoned: false, inactive: false, lastProgressMs: 0 }, bot: null },
  ];

  it('the viewer row follows local typing; rivals follow the snapshot', () => {
    const racers = racersWithLocalViewer(members, { position: 3, finishMs: null, abandoned: false, inactive: false, lastProgressMs: 0 }, 64);
    expect(racers.map((racer) => racer.progress.position)).toEqual([5, 3]);
  });

  it('a racer is finished at the end of the passage, even before the server finish time arrives', () => {
    const racers = racersWithLocalViewer(members, { position: 64, finishMs: null, abandoned: false, inactive: false, lastProgressMs: 0 }, 64);
    expect(racers.map((racer) => racer.isFinished)).toEqual([false, true]);
  });

  it('a rival with a server finish time is finished', () => {
    const finishedRival = [{ ...members[0]!, progress: { position: 64, finishMs: 9_400, abandoned: false, inactive: false, lastProgressMs: 0 } }, members[1]!];
    expect(racersWithLocalViewer(finishedRival, { position: 3, finishMs: null, abandoned: false, inactive: false, lastProgressMs: 0 }, 64)[0]!.isFinished).toBe(true);
  });

  it('a member without progress counts as not started', () => {
    const racers = racersWithLocalViewer([{ ...members[0]!, progress: null }], { position: 0, finishMs: null, abandoned: false, inactive: false, lastProgressMs: 0 }, 64);
    expect(racers[0]!.progress).toEqual({ position: 0, finishMs: null, abandoned: false, inactive: false, lastProgressMs: 0 });
  });
});

describe('progress milestones', () => {
  it('announces only 25, 50 and 75 percent', () => {
    expect([0, 24, 25, 49, 50, 74, 75, 99, 100].map(reachedMilestone)).toEqual([null, null, 25, 25, 50, 50, 75, 75, 75]);
  });
});
