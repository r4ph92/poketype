import { gameConfig } from '@/config/game';

const { connectedWithinMs, touchEveryMs } = gameConfig.rooms.memberPresence;

// Times are epoch milliseconds on the server clock: when the member's page last reached the server, and now.
export function isConnected(lastSeenAt: number, now: number): boolean {
  return now - lastSeenAt < connectedWithinMs;
}

export function isMemberSeenStale(lastSeenAt: number, now: number): boolean {
  return now - lastSeenAt >= touchEveryMs;
}
