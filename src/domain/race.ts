import { gameConfig } from '@/config/game';

export type RaceId = string & { readonly __brand: 'RaceId' };

export function hasEnoughPlayersToStart(memberCount: number): boolean {
  return memberCount >= gameConfig.race.minimumPlayers;
}

export function raceStartsAt(requestedAt: Date): Date {
  const { syncLeadMs, countdownSeconds } = gameConfig.race;
  return new Date(requestedAt.getTime() + syncLeadMs + countdownSeconds * 1000);
}
