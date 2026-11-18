import { gameConfig } from '@/config/game';

const { connectedWithinMs, touchEveryMs, hostTouchEveryMs, hostAwayAfterMs } = gameConfig.rooms.memberPresence;

// Times are epoch milliseconds on the server clock: when the member's page last reached the server, and now.
// A member who leaves a running race keeps their row for the results; dating their last sighting at the epoch makes them disconnected at once.
export const departedSeenAt = 0;

export function isConnected(lastSeenAt: number, now: number): boolean {
  return now - lastSeenAt < connectedWithinMs;
}

// Away is the short silence the others are told about (#44); only a silence past the connected window hands the host role over.
export function isHostAway(lastSeenAt: number, now: number): boolean {
  return now - lastSeenAt >= hostAwayAfterMs;
}

export function isMemberSeenStale(lastSeenAt: number, now: number): boolean {
  return now - lastSeenAt >= touchEveryMs;
}

// The host's reads are written more often, so a host who is still there is never shown as away.
export function isHostSeenStale(lastSeenAt: number, now: number): boolean {
  return now - lastSeenAt >= hostTouchEveryMs;
}
