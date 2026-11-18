import { isConnected, isHostAway } from './member-presence';
import type { RoomPhase } from './room-phase';

export type HostPresenceWork = 'mark-away' | 'clear-away' | 'pass';

// Epoch ms: hostSeenAt is when the host's page last reached the server, hostSinceAt when she took the role; isMarkedAway is whether the
// room already tells the others she is away.
export type HostPresence = { phase: RoomPhase; hostSeenAt: number; hostSinceAt: number; isMarkedAway: boolean };

// What a read or command must settle about the host's connection (SALLE-08, COURSE-08). A running race goes on without its host,
// so the rule only applies in the waiting room and once the results are shown.
export function hostPresenceWorkOf(presence: HostPresence, now: number): HostPresenceWork | null {
  const { phase, isMarkedAway } = presence;
  if (phase !== 'waiting' && phase !== 'results') return null;
  const silentSince = hostSilentSince(presence);
  if (!isConnected(silentSince, now)) return 'pass';
  const isAway = isHostAway(silentSince, now);
  if (isAway === isMarkedAway) return null;
  return isAway ? 'mark-away' : 'clear-away';
}

// A member who just took over was last seen on the slower member cadence; her silence as host starts when she got the role.
export function hostSilentSince({ hostSeenAt, hostSinceAt }: Pick<HostPresence, 'hostSeenAt' | 'hostSinceAt'>): number {
  return Math.max(hostSeenAt, hostSinceAt);
}
