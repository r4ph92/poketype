import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import { abandonmentMomentOf, isPresenceStale, presenceAt, presenceWorkOf, seenSince } from '../../src/domain/race-presence';
import type { RacerProgress, RoomMemberView, RoomSnapshot } from '../../src/domain/room-view';
import { defaultTextSettings } from '../../src/domain/text-settings';
import type { RoomCode } from '../../src/domain/room-code';
import type { RoomId } from '../../src/domain/room-id';

const { disconnectedAfterMs, abandonAfterDisconnectMs, presenceTouchMs } = gameConfig.race;
const startsAt = 1_790_000_000_000;

describe('presenceAt (COURSE-08)', () => {
  it('a racer heard from within 5 s is present, then disconnected, then gone after 30 s', () => {
    const seenAt = startsAt + 10_000;
    expect(presenceAt(seenAt, seenAt + disconnectedAfterMs - 1)).toBe('present');
    expect(presenceAt(seenAt, seenAt + disconnectedAfterMs)).toBe('disconnected');
    expect(presenceAt(seenAt, seenAt + abandonAfterDisconnectMs - 1)).toBe('disconnected');
    expect(presenceAt(seenAt, seenAt + abandonAfterDisconnectMs)).toBe('gone');
  });

  it('a read during the countdown counts as seen at the start, so nobody is judged before the race begins', () => {
    expect(seenSince(startsAt - 3_000, startsAt)).toBe(startsAt);
    expect(presenceAt(seenSince(startsAt - 3_000, startsAt), startsAt + disconnectedAfterMs - 1)).toBe('present');
  });

  it('dates the abandonment 30 s after the racer was last seen, whenever it is noticed', () => {
    expect(abandonmentMomentOf(startsAt + 40_000)).toBe(startsAt + 40_000 + abandonAfterDisconnectMs);
  });

  it('refreshes a reader’s own time at most once per touch interval', () => {
    expect(isPresenceStale(startsAt, startsAt + presenceTouchMs - 1)).toBe(false);
    expect(isPresenceStale(startsAt, startsAt + presenceTouchMs)).toBe(true);
  });
});

function racer(memberKey: string, isViewer: boolean, progress: Partial<RacerProgress>): RoomMemberView {
  const full: RacerProgress = { position: 40, finishMs: null, abandoned: false, inactive: false, lastProgressMs: 0, disconnected: false, abandonedOffline: false, lastSeenMs: 0, ...progress };
  return { memberKey, trainerName: memberKey, hasAccount: false, isHost: isViewer, isViewer, partner: null, profile: null, progress: full, bot: null };
}

function racing(members: RoomMemberView[], phase: RoomSnapshot['phase'] = 'racing'): RoomSnapshot {
  const race = { id: 'race', startsAt, deadlineAt: startsAt + 900_000, timeLimitSeconds: 300, errorMode: 'blocked' as const, passage: 'abc', language: 'fr' as const, credit: null, viewer: null, results: null, reward: null, coins: null, encounter: null, legendaries: [] };
  return { roomId: 'room' as RoomId, code: 'K7M2QX' as RoomCode, visibility: 'public', textSettings: defaultTextSettings('fr'), timeLimitSeconds: 300, phase, revision: 3, members, race, lobbyIdle: null };
}

describe('presenceWorkOf', () => {
  const now = startsAt + 60_000;
  const seenNow = now - startsAt;

  it('does nothing when everyone was just seen, and only refreshes the reader once their own time is stale', () => {
    expect(presenceWorkOf(racing([racer('zoe', true, { lastSeenMs: seenNow }), racer('alex', false, { lastSeenMs: seenNow - 1_000 })]), now)).toBeNull();
    expect(presenceWorkOf(racing([racer('zoe', true, { lastSeenMs: seenNow - presenceTouchMs })]), now)).toBe('touch');
  });

  it('syncs when another racer has been silent 5 s and is not shown as disconnected yet, but not once they are', () => {
    const silent = seenNow - disconnectedAfterMs;
    expect(presenceWorkOf(racing([racer('alex', true, { lastSeenMs: seenNow }), racer('zoe', false, { lastSeenMs: silent })]), now)).toBe('sync');
    expect(presenceWorkOf(racing([racer('alex', true, { lastSeenMs: seenNow }), racer('zoe', false, { lastSeenMs: silent, disconnected: true })]), now)).toBeNull();
  });

  it('syncs when a racer has been silent 30 s, the reader included, so a late return counts as an abandonment first', () => {
    expect(presenceWorkOf(racing([racer('zoe', true, { lastSeenMs: seenNow - abandonAfterDisconnectMs })]), now)).toBe('sync');
    expect(presenceWorkOf(racing([racer('alex', true, { lastSeenMs: seenNow }), racer('zoe', false, { lastSeenMs: seenNow - abandonAfterDisconnectMs, disconnected: true })]), now)).toBe('sync');
  });

  it('syncs when the reader comes back while the others are told they are disconnected', () => {
    expect(presenceWorkOf(racing([racer('zoe', true, { lastSeenMs: seenNow - 8_000, disconnected: true })]), now)).toBe('sync');
  });

  it('ignores racers who are done, bots, and rooms that are not racing', () => {
    const long = seenNow - abandonAfterDisconnectMs;
    const done = [racer('a', false, { lastSeenMs: long, finishMs: 9_000 }), racer('b', false, { lastSeenMs: long, abandoned: true }), racer('c', false, { lastSeenMs: long, inactive: true })];
    expect(presenceWorkOf(racing([racer('zoe', true, { lastSeenMs: seenNow }), ...done]), now)).toBeNull();
    const bot = { ...racer('bot', false, { lastSeenMs: 0 }), bot: { character: 'misty', level: 'beginner', seed: 1 } } as RoomMemberView;
    expect(presenceWorkOf(racing([racer('zoe', true, { lastSeenMs: seenNow }), bot]), now)).toBeNull();
    expect(presenceWorkOf(racing([racer('zoe', true, { lastSeenMs: 0 })], 'results'), now)).toBeNull();
  });
});
