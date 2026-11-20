import { gameConfig } from '@/config/game';
import { isCanonicalUuid } from './uuid';

export type RaceId = string & { readonly __brand: 'RaceId' };

export function parseRaceId(value: unknown): RaceId | null {
  return isCanonicalUuid(value) ? (value as RaceId) : null;
}

export function hasEnoughPlayersToStart(memberCount: number): boolean {
  return memberCount >= gameConfig.race.minimumPlayers;
}

// racerCount counts the humans who race and the bots; a spectating host is in neither count (SALLE-01).
export type StartBlocker = 'not-enough-players' | 'no-human-player';

export function startBlockerOf({ racerCount, humanCount }: { racerCount: number; humanCount: number }): StartBlocker | null {
  if (humanCount < gameConfig.race.minimumHumanPlayers) return 'no-human-player';
  return hasEnoughPlayersToStart(racerCount) ? null : 'not-enough-players';
}

export function raceStartsAt(requestedAt: Date): Date {
  const { syncLeadMs, countdownSeconds } = gameConfig.race;
  return new Date(requestedAt.getTime() + syncLeadMs + countdownSeconds * 1000);
}

export function acceptsTypingAt(startsAt: Date, now: Date): boolean {
  return now.getTime() >= startsAt.getTime();
}

// lastProgressAt is the last accepted progress report, or the start for a racer who never typed; a countdown is never inactivity.
export function isInactiveSince(lastProgressAt: Date, now: Date): boolean {
  return now.getTime() - lastProgressAt.getTime() >= gameConfig.race.inactiveAfterSeconds * 1000;
}

// A report or read stamped exactly at the deadline is already too late.
export function isPastDeadline(deadlineAt: Date, now: Date): boolean {
  return now.getTime() >= deadlineAt.getTime();
}
