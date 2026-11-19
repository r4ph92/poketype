import { gameConfig } from '@/config/game';

// A results room ended before this instant is no longer offered.
export function resultsListedSince(now: Date): Date {
  return new Date(now.getTime() - gameConfig.publicRooms.resultsListedForMs);
}
