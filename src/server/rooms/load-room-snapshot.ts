import type { GuestId } from '@/domain/guest-id';
import { hostPresenceWorkOf, type HostPresence } from '@/domain/host-presence';
import { isLobbyClosingAt } from '@/domain/lobby-idle';
import { isHostSeenStale, isMemberSeenStale } from '@/domain/member-presence';
import { isPastDeadline } from '@/domain/race';
import { idleEndOfMembers } from '@/domain/race-idleness';
import { presenceWorkOf } from '@/domain/race-presence';
import type { RoomId } from '@/domain/room-id';
import { isRaceRunning } from '@/domain/room-phase';
import { isViewerHost } from '@/domain/room-view';
import type { Database } from '../db/types';
import { settleHostPresence } from './host-presence';
import { closeIdleRoom } from './idle-room';
import { touchMemberPresence } from './member-presence';
import { settleDueRace } from './race-deadline';
import { syncRacePresence, touchPresence } from './race-presence';
import { findRoomSnapshot, type RoomSnapshotResult } from './room-snapshot';

// hasChangedRoom tells the caller this read ended the race, closed the idle room, changed a racer's presence or the host's, so it can announce the change to the other members.
export type LoadedRoomSnapshot = { found: RoomSnapshotResult; hasChangedRoom: boolean };

type FoundSnapshot = Extract<RoomSnapshotResult, { kind: 'snapshot' }>;

type DueChange = (database: Database, roomId: RoomId, now: Date, viewerGuestId: GuestId) => Promise<boolean>;

// The one read path for members: a race past its deadline is settled, a lobby past its idle close time is closed, racers' presence is applied
// (COURSE-08) and an absent host is shown away or replaced (#44) before it is shown. The snapshot itself is the cheap pre-check, so a room with
// nothing due costs no extra query; a reader whose own last-seen time is only stale gets one unlocked write and the same snapshot. Every read
// also keeps the member connected for host transfer (#76).
export async function loadRoomSnapshot(database: Database, roomId: RoomId, viewerGuestId: GuestId, now: Date): Promise<LoadedRoomSnapshot> {
  const found = await findRoomSnapshot(database, roomId, viewerGuestId);
  if (found.kind !== 'snapshot') return { found, hasChangedRoom: false };
  if (isViewerSeenStale(found, now)) await touchMemberPresence(database, { roomId, guestId: viewerGuestId, seenAt: now });
  const presenceWork = presenceWorkOf(found.snapshot, now.getTime());
  const dueChange = dueChangeOf(found, now) ?? (presenceWork === 'sync' ? syncRacePresence : null);
  if (presenceWork === 'touch' && !dueChange) await touchPresence(database, roomId, viewerGuestId, now);
  if (!dueChange) return { found, hasChangedRoom: false };
  const hasChangedRoom = await dueChange(database, roomId, now, viewerGuestId);
  return { found: await findRoomSnapshot(database, roomId, viewerGuestId), hasChangedRoom };
}

function isViewerSeenStale({ snapshot, viewerSeenAt }: FoundSnapshot, now: Date): boolean {
  const isStale = isViewerHost(snapshot) ? isHostSeenStale : isMemberSeenStale;
  return isStale(viewerSeenAt.getTime(), now.getTime());
}

function dueChangeOf(found: FoundSnapshot, now: Date): DueChange | null {
  const { phase, race, lobbyIdle } = found.snapshot;
  if (isRaceRunning(phase) && race !== null && isRaceDue(found, now)) return settleDueRace;
  if (lobbyIdle !== null && isLobbyClosingAt(lobbyIdle, now.getTime())) return closeIdleRoom;
  if (hostPresenceWorkOf(hostPresenceOf(found, now), now.getTime()) !== null) return settleHostPresence;
  return null;
}

function isRaceDue({ snapshot }: FoundSnapshot, now: Date): boolean {
  const { race, members } = snapshot;
  if (race === null) return false;
  if (isPastDeadline(new Date(race.deadlineAt), now)) return true;
  const idleEnd = idleEndOfMembers(members, race.startsAt);
  return idleEnd !== null && now.getTime() >= idleEnd;
}

// The host reading the room has just been seen, whatever the snapshot read before that sighting says.
function hostPresenceOf({ snapshot, hostSeenAt, hostSinceAt }: FoundSnapshot, now: Date): HostPresence {
  const seenAt = isViewerHost(snapshot) ? now : hostSeenAt;
  return { phase: snapshot.phase, hostSeenAt: seenAt.getTime(), hostSinceAt: hostSinceAt.getTime(), isMarkedAway: snapshot.isHostAway };
}
