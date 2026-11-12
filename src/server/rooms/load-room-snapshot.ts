import type { GuestId } from '@/domain/guest-id';
import { isLobbyClosingAt } from '@/domain/lobby-idle';
import { isPastDeadline } from '@/domain/race';
import { presenceWorkOf } from '@/domain/race-presence';
import type { RoomId } from '@/domain/room-id';
import { isRaceRunning } from '@/domain/room-phase';
import type { RoomSnapshot } from '@/domain/room-view';
import type { Database } from '../db/types';
import { closeIdleRoom } from './idle-room';
import { settleDueRace } from './race-deadline';
import { syncRacePresence, touchPresence } from './race-presence';
import { findRoomSnapshot, type RoomSnapshotResult } from './room-snapshot';

// hasChangedRoom tells the caller this read ended the race, closed the idle room or changed a racer's presence, so it can announce the change to the other members.
export type LoadedRoomSnapshot = { found: RoomSnapshotResult; hasChangedRoom: boolean };

type DueChange = (database: Database, roomId: RoomId, now: Date, viewerGuestId: GuestId) => Promise<boolean>;

// The one read path for members: a race past its deadline is settled, a lobby past its idle close time is closed, and racers' presence is applied
// (COURSE-08) before it is shown. The snapshot itself is the cheap pre-check, so a room with nothing due costs no extra query; a reader whose own
// last-seen time is only stale gets one unlocked write and the same snapshot.
export async function loadRoomSnapshot(database: Database, roomId: RoomId, viewerGuestId: GuestId, now: Date): Promise<LoadedRoomSnapshot> {
  const found = await findRoomSnapshot(database, roomId, viewerGuestId);
  if (found.kind !== 'snapshot') return { found, hasChangedRoom: false };
  const presenceWork = presenceWorkOf(found.snapshot, now.getTime());
  const dueChange = dueChangeOf(found.snapshot, now) ?? (presenceWork === 'sync' ? syncRacePresence : null);
  if (presenceWork === 'touch' && !dueChange) await touchPresence(database, roomId, viewerGuestId, now);
  if (!dueChange) return { found, hasChangedRoom: false };
  const hasChangedRoom = await dueChange(database, roomId, now, viewerGuestId);
  return { found: await findRoomSnapshot(database, roomId, viewerGuestId), hasChangedRoom };
}

function dueChangeOf({ phase, race, lobbyIdle }: RoomSnapshot, now: Date): DueChange | null {
  if (isRaceRunning(phase) && race !== null && isPastDeadline(new Date(race.deadlineAt), now)) return settleDueRace;
  if (lobbyIdle !== null && isLobbyClosingAt(lobbyIdle, now.getTime())) return closeIdleRoom;
  return null;
}
