import { gameConfig } from '@/config/game';
import { isStillRacing, type RoomMemberView } from './room-view';

const inactiveAfterMs = gameConfig.race.inactiveAfterSeconds * 1000;

// The racers the host may remove from the race now: still racing, not the viewer, and without an accepted report for the configured time.
// The server checks the same rule from its own timestamps; this only decides when the "Retirer" button shows.
export function removableRacerKeys(members: readonly RoomMemberView[], startsAt: number, serverNow: number): string[] {
  return members.filter((member) => !member.isViewer && isInactiveAt(member, startsAt, serverNow)).map((member) => member.memberKey);
}

function isInactiveAt({ progress }: RoomMemberView, startsAt: number, serverNow: number): boolean {
  if (progress === null || !isStillRacing(progress)) return false;
  return serverNow - (startsAt + progress.lastProgressMs) >= inactiveAfterMs;
}

// How long until the next racer crosses the inactivity mark, so the view wakes exactly then; null when nobody will.
export function msUntilNextInactivity(members: readonly RoomMemberView[], startsAt: number, serverNow: number): number | null {
  const delays = members.flatMap(({ isViewer, progress }) => {
    if (isViewer || progress === null || !isStillRacing(progress)) return [];
    const delayMs = startsAt + progress.lastProgressMs + inactiveAfterMs - serverNow;
    return delayMs > 0 ? [delayMs] : [];
  });
  return delays.length > 0 ? Math.min(...delays) : null;
}
