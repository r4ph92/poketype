import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import { msUntilNextInactivity, removableRacerKeys } from '../../src/domain/race-inactivity';
import type { RacerProgress, RoomMemberView } from '../../src/domain/room-view';

const startsAt = 1_790_000_000_000;
const inactiveAfterMs = gameConfig.race.inactiveAfterSeconds * 1000;

function member(memberKey: string, progress: Partial<RacerProgress> = {}, isViewer = false): RoomMemberView {
  const full: RacerProgress = { position: 0, finishMs: null, abandoned: false, inactive: false, lastProgressMs: 0, ...progress };
  return { memberKey, trainerName: memberKey, hasAccount: false, isHost: false, isViewer, partner: null, profile: null, progress: full, bot: null };
}

describe('removableRacerKeys', () => {
  it('offers a racer once the configured time has passed since their last accepted report', () => {
    const typist = member('zoe', { position: 12, lastProgressMs: 5_000 });
    expect(removableRacerKeys([typist], startsAt, startsAt + 5_000 + inactiveAfterMs - 1)).toEqual([]);
    expect(removableRacerKeys([typist], startsAt, startsAt + 5_000 + inactiveAfterMs)).toEqual(['zoe']);
  });

  it('counts from the start for a racer who never typed', () => {
    expect(removableRacerKeys([member('nina')], startsAt, startsAt + inactiveAfterMs)).toEqual(['nina']);
  });

  it('never offers the viewer, a finisher, an abandoner or a racer already inactive', () => {
    const members = [member('host', {}, true), member('done', { finishMs: 9_000 }), member('gone', { abandoned: true }), member('out', { inactive: true })];
    expect(removableRacerKeys(members, startsAt, startsAt + 10 * inactiveAfterMs)).toEqual([]);
  });
});

describe('msUntilNextInactivity', () => {
  it('wakes at the next racer to cross the mark, and never when nobody will', () => {
    const members = [member('zoe', { lastProgressMs: 20_000 }), member('nina', { lastProgressMs: 10_000 })];
    expect(msUntilNextInactivity(members, startsAt, startsAt + 15_000)).toBe(10_000 + inactiveAfterMs - 15_000);
    expect(msUntilNextInactivity([member('done', { finishMs: 1 })], startsAt, startsAt)).toBeNull();
  });
});
