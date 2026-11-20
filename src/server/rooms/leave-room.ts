import { and, eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import { isRaceRunning, isRoomOpen } from '@/domain/room-phase';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { abandonCurrentRace } from './abandon-race';
import { passHostRole } from './host-succession';
import { markMemberDeparted } from './member-presence';
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

async function stepOut(transaction: DatabaseTransaction, room: LockedRoom, request: LeaveRoomRequest): Promise<void> {
  if (isRaceRunning(room.phase) && !(await isSpectatorIn(transaction, request))) await leaveRunningRace(transaction, request);
  else await removeMember(transaction, request);
}

// The membership stays during a race so the results can still list the leaver as "Abandon"; joinRoom already refuses a room past its waiting phase.
// A finisher, or a racer leaving after the deadline, is not an abandoner, so the departure mark is what keeps them from becoming host.
async function leaveRunningRace(transaction: DatabaseTransaction, { roomId, guestId, leftAt }: LeaveRoomRequest): Promise<void> {
  await abandonCurrentRace(transaction, { roomId, guestId, abandonedAt: leftAt });
  await markMemberDeparted(transaction, roomId, guestId);
}

// A leave from the results counts too, harmlessly: the idle clock only runs in the waiting phase.
async function removeMember(transaction: DatabaseTransaction, { roomId, guestId, leftAt }: LeaveRoomRequest): Promise<void> {
  await transaction.delete(schema.roomMembers).where(and(eq(schema.roomMembers.roomId, roomId), eq(schema.roomMembers.guestId, guestId)));
  await recordLobbyActivity(transaction, roomId, leftAt);
  await bumpRevision(transaction, roomId);
}

// A spectating host has no race row for the results to list, so leaving the race removes her like a lobby leave.
async function isSpectatorIn(transaction: DatabaseTransaction, { roomId, guestId }: LeaveRoomRequest): Promise<boolean> {
  const [member] = await transaction
    .select({ isSpectator: schema.roomMembers.isSpectator })
    .from(schema.roomMembers)
    .where(and(eq(schema.roomMembers.roomId, roomId), eq(schema.roomMembers.guestId, guestId)));
  return member?.isSpectator === true;
}
