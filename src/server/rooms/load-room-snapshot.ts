import type { GuestId } from '@/domain/guest-id';
import { isLobbyClosingAt } from '@/domain/lobby-idle';
import { isPastDeadline } from '@/domain/race';
import type { RoomId } from '@/domain/room-id';
import { isRaceRunning } from '@/domain/room-phase';
import type { RoomSnapshot } from '@/domain/room-view';
import type { Database } from '../db/types';
import { closeIdleRoom } from './idle-room';
import { settleDueRace } from './race-deadline';
import { findRoomSnapshot, type RoomSnapshotResult } from './room-snapshot';

// hasChangedRoom tells the caller this read ended the race or closed the idle room, so it can announce the change to the other members.
export type LoadedRoomSnapshot = { found: RoomSnapshotResult; hasChangedRoom: boolean };

type DueChange = (database: Database, roomId: RoomId, now: Date) => Promise<boolean>;

// The one read path for members: a race past its deadline is settled and a lobby past its idle close time is closed before it is shown.
// The snapshot itself is the cheap pre-check, so a room with nothing due costs no extra query.
export async function loadRoomSnapshot(database: Database, roomId: RoomId, viewerGuestId: GuestId, now: Date): Promise<LoadedRoomSnapshot> {
  const found = await findRoomSnapshot(database, roomId, viewerGuestId);
  const dueChange = found.kind === 'snapshot' ? dueChangeOf(found.snapshot, now) : null;
  if (!dueChange) return { found, hasChangedRoom: false };
  const hasChangedRoom = await dueChange(database, roomId, now);
  return { found: await findRoomSnapshot(database, roomId, viewerGuestId), hasChangedRoom };
}

function dueChangeOf({ phase, race, lobbyIdle }: RoomSnapshot, now: Date): DueChange | null {
  if (isRaceRunning(phase) && race !== null && isPastDeadline(new Date(race.deadlineAt), now)) return settleDueRace;
  if (lobbyIdle !== null && isLobbyClosingAt(lobbyIdle, now.getTime())) return closeIdleRoom;
  return null;
}
