import { gameConfig } from '@/config/game';
import { isRaceRunning } from './room-phase';
import { isStillRacing, type RoomSnapshot } from './room-view';

const { disconnectedAfterMs, abandonAfterDisconnectMs, presenceTouchMs } = gameConfig.race;

// present: heard from recently; disconnected: silent long enough for the others to be told; gone: silent long enough to count as an abandonment.
export type Presence = 'present' | 'disconnected' | 'gone';

// A read during the countdown counts as seen at the start, so nobody is judged before the race begins. All times are epoch milliseconds on the server clock.
export function seenSince(lastSeenAt: number, startsAt: number): number {
  return Math.max(lastSeenAt, startsAt);
}

export function presenceAt(seenAt: number, now: number): Presence {
  const silentMs = now - seenAt;
  if (silentMs >= abandonAfterDisconnectMs) return 'gone';
  return silentMs >= disconnectedAfterMs ? 'disconnected' : 'present';
}

// The abandonment is dated when the delay ran out, not when a request noticed it, so every path settles the same moment.
export function abandonmentMomentOf(seenAt: number): number {
  return seenAt + abandonAfterDisconnectMs;
}

export function disconnectionMomentOf(seenAt: number): number {
  return seenAt + disconnectedAfterMs;
}

// A racer's own reads refresh their last-seen time at most this often, so polling four times a second writes once.
export function isPresenceStale(seenAt: number, now: number): boolean {
  return now - seenAt >= presenceTouchMs;
}

// What a member's snapshot read must do about presence, decided from the snapshot itself so a read with nothing due costs no lock:
// sync when someone is gone, newly disconnected, or the reader is coming back from a disconnection; touch when only the reader's own time is stale.
export function presenceWorkOf({ phase, race, members }: RoomSnapshot, now: number): 'sync' | 'touch' | null {
  if (!isRaceRunning(phase) || race === null) return null;
  let isTouchDue = false;
  for (const { progress, isViewer, bot } of members) {
    if (bot !== null || progress === null || !isStillRacing(progress)) continue;
    const seenAt = race.startsAt + progress.lastSeenMs;
    const presence = presenceAt(seenAt, now);
    if (presence === 'gone') return 'sync';
    if (isViewer && progress.disconnected) return 'sync';
    if (!isViewer && presence === 'disconnected' && !progress.disconnected) return 'sync';
    if (isViewer) isTouchDue = isPresenceStale(seenAt, now);
  }
  return isTouchDue ? 'touch' : null;
}
