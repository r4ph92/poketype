import { gameConfig } from '@/config/game';
import { isStillRacing, type RoomMemberView } from './room-view';

const secondsPerMinute = 60;

// JEU-4: the race ends once the humans still racing have all been silent for the idle delay, counted from the latest of their last accepted reports
// (the race start for a racer who never typed). Null when no human is still racing: the race is then ending through finishes and abandonments.
export function idleEndMs(lastProgressMoments: readonly number[]): number | null {
  if (lastProgressMoments.length === 0) return null;
  return Math.max(...lastProgressMoments) + gameConfig.race.idleEndAfterSeconds * 1000;
}

// The server settles from its own rows; this only lets a snapshot read tell cheaply that a race may be due. Bots never keep a race alive.
export function idleEndOfMembers(members: readonly RoomMemberView[], startsAt: number): number | null {
  const moments = members.flatMap(({ bot, progress }) => (bot === null && progress !== null && isStillRacing(progress) ? [startsAt + progress.lastProgressMs] : []));
  return idleEndMs(moments);
}

// The delay as the results line names it, in whole minutes.
export function idleEndMinutes(): number {
  return Math.round(gameConfig.race.idleEndAfterSeconds / secondsPerMinute);
}

export function isIdleSince(lastProgressMs: number, nowMs: number): boolean {
  return nowMs - lastProgressMs >= gameConfig.race.idleEndAfterSeconds * 1000;
}
