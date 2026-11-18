import { and, eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import { isRaceRunning, isRoomOpen } from '@/domain/room-phase';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { abandonCurrentRace } from './abandon-race';
import { passHostRole } from './host-succession';
import { closeIfIdle, recordLobbyActivity } from './idle-room';
import { bumpRevision, isMember, lockRoom, type LockedRoom } from './room-rows';

export type LeaveRoomRequest = { roomId: RoomId; guestId: GuestId; leftAt: Date };

// closed: the host left and nobody connected remained to take over (#76), or the room was past its idle close time.
export type LeaveRoomResult = 'left' | 'closed' | 'not-member' | 'not-found';

// The leaver is always the session's guest, never a name in the request, so nobody can remove someone else.
export async function leaveRoom(database: Database, request: LeaveRoomRequest): Promise<LeaveRoomResult> {
  const { roomId, guestId, leftAt } = request;
  return database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (!room || !isRoomOpen(room.phase)) return 'not-found';
    if (!(await isMember(transaction, roomId, guestId))) return 'not-member';
    if (await closeIfIdle(transaction, room, leftAt)) return 'closed';
    await stepOut(transaction, room, request);
    if (room.hostGuestId !== guestId) return 'left';
    return (await passHostRole(transaction, room, leftAt)) === 'closed' ? 'closed' : 'left';
  });
}

// The membership stays during a race so the results can still list the leaver as "Abandon"; joinRoom already refuses a room past its waiting phase.
async function stepOut(transaction: DatabaseTransaction, room: LockedRoom, request: LeaveRoomRequest): Promise<void> {
  if (isRaceRunning(room.phase)) await abandonCurrentRace(transaction, { roomId: request.roomId, guestId: request.guestId, abandonedAt: request.leftAt });
  else await removeMember(transaction, request);
}

// A leave from the results counts too, harmlessly: the idle clock only runs in the waiting phase.
async function removeMember(transaction: DatabaseTransaction, { roomId, guestId, leftAt }: LeaveRoomRequest): Promise<void> {
  await transaction.delete(schema.roomMembers).where(and(eq(schema.roomMembers.roomId, roomId), eq(schema.roomMembers.guestId, guestId)));
  await recordLobbyActivity(transaction, roomId, leftAt);
  await bumpRevision(transaction, roomId);
}
