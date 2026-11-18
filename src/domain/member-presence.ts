import { gameConfig } from '@/config/game';

const { connectedWithinMs, touchEveryMs } = gameConfig.rooms.memberPresence;

// Times are epoch milliseconds on the server clock: when the member's page last reached the server, and now.
// A member who leaves a running race keeps their row for the results; dating their last sighting at the epoch makes them disconnected at once.
export const departedSeenAt = 0;

export function isConnected(lastSeenAt: number, now: number): boolean {
  return now - lastSeenAt < connectedWithinMs;
}

export function isMemberSeenStale(lastSeenAt: number, now: number): boolean {
  return now - lastSeenAt >= touchEveryMs;
}
