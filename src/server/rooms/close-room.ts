import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import { isRoomOpen } from '@/domain/room-phase';
import type { Database } from '../db/types';
import { closeLockedRoom } from './close-locked-room';
import { isMember, lockRoom } from './room-rows';

export type CloseRoomRequest = { roomId: RoomId; guestId: GuestId; closedAt: Date };

export type CloseRoomResult = 'closed' | 'not-results' | 'not-host' | 'not-member' | 'not-found';

// Only the host, only from the results: the room closes for everyone and its settled race and rewards stay as they are.
export async function closeRoom(database: Database, { roomId, guestId, closedAt }: CloseRoomRequest): Promise<CloseRoomResult> {
  return database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (!room || !isRoomOpen(room.phase)) return 'not-found';
    if (!(await isMember(transaction, roomId, guestId))) return 'not-member';
    if (room.hostGuestId !== guestId) return 'not-host';
    if (room.phase !== 'results') return 'not-results';
    await closeLockedRoom(transaction, roomId, 'host-closed', closedAt);
    return 'closed';
  });
}
