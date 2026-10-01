import type { GuestId } from '@/domain/guest-id';
import { isPastDeadline } from '@/domain/race';
import type { RoomId } from '@/domain/room-id';
import { isRaceRunning } from '@/domain/room-phase';
import type { RoomSnapshot } from '@/domain/room-view';
import type { Database } from '../db/types';
import { settleDueRace } from './race-deadline';
import { findRoomSnapshot, type RoomSnapshotResult } from './room-snapshot';

// The one read path for members: a race past its deadline is settled before it is shown, so the results never wait for a report.
// The snapshot itself is the cheap pre-check, so a race still running costs no extra query.
export async function loadRoomSnapshot(database: Database, roomId: RoomId, viewerGuestId: GuestId, now: Date): Promise<RoomSnapshotResult> {
  const found = await findRoomSnapshot(database, roomId, viewerGuestId);
  if (found.kind !== 'snapshot' || !isDueAt(found.snapshot, now)) return found;
  await settleDueRace(database, roomId, now);
  return findRoomSnapshot(database, roomId, viewerGuestId);
}

function isDueAt({ phase, race }: RoomSnapshot, now: Date): boolean {
  return isRaceRunning(phase) && race !== null && isPastDeadline(new Date(race.deadlineAt), now);
}
