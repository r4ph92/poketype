import type { GuestId } from './guest-id';
import { isConnected } from './member-presence';

// Bots are never members, so they never take over; hasLeft covers the leaving host and abandoners of the race the room holds.
export type HostCandidate = { memberId: string; guestId: GuestId; joinedAt: number; lastSeenAt: number; hasLeft: boolean };

// The member id breaks a tie, matching the order the room lists its members; null means the room closes.
export function nextHostOf(candidates: readonly HostCandidate[], now: number): GuestId | null {
  const eligible = candidates.filter((candidate) => !candidate.hasLeft && isConnected(candidate.lastSeenAt, now));
  const [longestPresent] = eligible.toSorted(byPresenceLength);
  return longestPresent?.guestId ?? null;
}

function byPresenceLength(first: HostCandidate, second: HostCandidate): number {
  if (first.joinedAt !== second.joinedAt) return first.joinedAt - second.joinedAt;
  return first.memberId < second.memberId ? -1 : 1;
}
