import { isConnected, isHostAway } from './member-presence';
import type { RoomPhase } from './room-phase';

export type HostPresenceWork = 'mark-away' | 'clear-away' | 'pass';

// hostSeenAt is when the host's page last reached the server (epoch ms); isMarkedAway is whether the room already tells the others so.
export type HostPresence = { phase: RoomPhase; hostSeenAt: number; isMarkedAway: boolean };

// What a read or command must settle about the host's connection (SALLE-08, COURSE-08). A running race goes on without its host,
// so the rule only applies in the waiting room and once the results are shown.
export function hostPresenceWorkOf({ phase, hostSeenAt, isMarkedAway }: HostPresence, now: number): HostPresenceWork | null {
  if (phase !== 'waiting' && phase !== 'results') return null;
  if (!isConnected(hostSeenAt, now)) return 'pass';
  const isAway = isHostAway(hostSeenAt, now);
  if (isAway === isMarkedAway) return null;
  return isAway ? 'mark-away' : 'clear-away';
}
