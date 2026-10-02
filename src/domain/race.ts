import { gameConfig } from '@/config/game';
import { isCanonicalUuid } from './uuid';

export type RaceId = string & { readonly __brand: 'RaceId' };

export function parseRaceId(value: unknown): RaceId | null {
  return isCanonicalUuid(value) ? (value as RaceId) : null;
}

export function hasEnoughPlayersToStart(memberCount: number): boolean {
  return memberCount >= gameConfig.race.minimumPlayers;
}

export function raceStartsAt(requestedAt: Date): Date {
  const { syncLeadMs, countdownSeconds } = gameConfig.race;
  return new Date(requestedAt.getTime() + syncLeadMs + countdownSeconds * 1000);
}

export function acceptsTypingAt(startsAt: Date, now: Date): boolean {
  return now.getTime() >= startsAt.getTime();
}

export function raceDeadline(startsAt: Date): Date {
  return new Date(startsAt.getTime() + gameConfig.race.timeLimitSeconds * 1000);
}

// A report or read stamped exactly at the deadline is already too late.
export function isPastDeadline(deadlineAt: Date, now: Date): boolean {
  return now.getTime() >= deadlineAt.getTime();
}
