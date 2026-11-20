import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import { idleEndMinutes, idleEndMs, idleEndOfMembers, isIdleSince } from '../../src/domain/race-idleness';
import type { RacerProgress, RoomMemberView } from '../../src/domain/room-view';

const idleMs = gameConfig.race.idleEndAfterSeconds * 1000;
const startsAt = 1_000_000;

const racing: RacerProgress = { position: 0, finishMs: null, abandoned: false, inactive: false, lastProgressMs: 0, disconnected: false, abandonedOffline: false, lastSeenMs: 0 };

function member(progress: RacerProgress | null, bot: RoomMemberView['bot'] = null): RoomMemberView {
  return { memberKey: 'k', trainerName: 'Zoe', avatarSeed: 1, partner: null, profile: null, hasAccount: false, isHost: false, isSpectator: false, isViewer: false, progress, bot };
}

describe('the idle end of a race', () => {
  it('is the latest last progress of the racers still racing plus the delay', () => {
    expect(idleEndMs([10_000, 70_000, 30_000])).toBe(70_000 + idleMs);
  });

  it('does not exist without a racer still racing', () => {
    expect(idleEndMs([])).toBeNull();
  });

  it('counts a human who never typed from the race start', () => {
    expect(idleEndOfMembers([member(racing)], startsAt)).toBe(startsAt + idleMs);
  });

  it('ignores bots, finishers, abandoners and removed racers', () => {
    const typist = member({ ...racing, lastProgressMs: 5_000 });
    const others = [
      member({ ...racing, lastProgressMs: 90_000 }, { character: 'brock', level: 'novice', seed: 1 }),
      member({ ...racing, finishMs: 80_000, lastProgressMs: 80_000 }),
      member({ ...racing, abandoned: true, lastProgressMs: 70_000 }),
      member({ ...racing, inactive: true, lastProgressMs: 60_000 }),
      member(null),
    ];
    expect(idleEndOfMembers([typist, ...others], startsAt)).toBe(startsAt + 5_000 + idleMs);
  });

  it('is reached exactly at the delay', () => {
    expect(isIdleSince(0, idleMs - 1)).toBe(false);
    expect(isIdleSince(0, idleMs)).toBe(true);
  });

  it('is named in whole minutes in the results line', () => {
    expect(idleEndMinutes()).toBe(3);
  });
});
