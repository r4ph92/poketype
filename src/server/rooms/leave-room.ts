import { and, eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import { isRaceRunning, isRoomOpen } from '@/domain/room-phase';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { abandonCurrentRace, type AbandonRaceRequest } from './abandon-race';
import { closeIfIdle, recordLobbyActivity } from './idle-room';
import { bumpRevision, isMember, lockRoom } from './room-rows';

export type LeaveRoomRequest = { roomId: RoomId; guestId: GuestId; leftAt: Date };

// closed: the host left, so the room is over for everyone.
export type LeaveRoomResult = 'left' | 'closed' | 'not-member' | 'not-found';

// The leaver is always the session's guest, never a name in the request, so nobody can remove someone else.
// closed also covers a room past its idle close time, which this call closes for everyone.
export async function leaveRoom(database: Database, request: LeaveRoomRequest): Promise<LeaveRoomResult> {
  const { roomId, guestId, leftAt } = request;
  return database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (!room || !isRoomOpen(room.phase)) return 'not-found';
    if (!(await isMember(transaction, roomId, guestId))) return 'not-member';
    if (await closeIfIdle(transaction, room, leftAt)) return 'closed';
    if (room.hostGuestId === guestId) return closeRoom(transaction, roomId);
    if (isRaceRunning(room.phase)) return abandonAndStay(transaction, { roomId, guestId, abandonedAt: leftAt });
    return removeMember(transaction, request);
  });
}

// A running race is discarded without settlement: nobody is rewarded for a race the host cut short. Host transfer (#76) will replace this.
async function closeRoom(transaction: DatabaseTransaction, roomId: RoomId): Promise<LeaveRoomResult> {
  await transaction.update(schema.rooms).set({ phase: 'closed', closeReason: 'host-left' }).where(eq(schema.rooms.id, roomId));
  await bumpRevision(transaction, roomId);
  return 'closed';
}

// The membership stays during a race so the results can still list the leaver as "Abandon"; joinRoom already refuses a room past its waiting phase.
async function abandonAndStay(transaction: DatabaseTransaction, request: AbandonRaceRequest): Promise<LeaveRoomResult> {
  await abandonCurrentRace(transaction, request);
  return 'left';
}

// A leave from the results counts too, harmlessly: the idle clock only runs in the waiting phase.
async function removeMember(transaction: DatabaseTransaction, { roomId, guestId, leftAt }: LeaveRoomRequest): Promise<LeaveRoomResult> {
  await transaction.delete(schema.roomMembers).where(and(eq(schema.roomMembers.roomId, roomId), eq(schema.roomMembers.guestId, guestId)));
  await recordLobbyActivity(transaction, roomId, leftAt);
  await bumpRevision(transaction, roomId);
  return 'left';
}
