import { and, eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import type { HostRole } from '@/domain/host-role';
import type { RoomId } from '@/domain/room-id';
import { isRoomOpen } from '@/domain/room-phase';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { closeIfIdle, recordLobbyActivity } from './idle-room';
import { bumpRevision, isMember, isRoomFull, lockRoom } from './room-rows';

export type ChangeHostRoleRequest = { roomId: RoomId; guestId: GuestId; role: HostRole; changedAt: Date };

export type ChangeHostRoleResult = 'changed' | 'unchanged' | 'full' | 'race-running' | 'not-host' | 'not-member' | 'not-found';

// Only the host, and only between races (the waiting room and the results): a race keeps the roles it started with.
// The caller is always the session's guest, so a player cannot change the host's role by naming it.
export async function changeHostRole(database: Database, request: ChangeHostRoleRequest): Promise<ChangeHostRoleResult> {
  const { roomId, guestId, role, changedAt } = request;
  return database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (!room || !isRoomOpen(room.phase)) return 'not-found';
    if (!(await isMember(transaction, roomId, guestId))) return 'not-member';
    if (await closeIfIdle(transaction, room, changedAt)) return 'not-found';
    if (room.hostGuestId !== guestId) return 'not-host';
    if (room.phase !== 'waiting' && room.phase !== 'results') return 'race-running';
    if (await hasRole(transaction, roomId, guestId, role)) return 'unchanged';
    // Taking a seat needs one free; the host's own row is not counted while they spectate.
    if (role === 'participant' && (await isRoomFull(transaction, room))) return 'full';
    await storeRole(transaction, request);
    return 'changed';
  });
}

async function hasRole(transaction: DatabaseTransaction, roomId: RoomId, guestId: GuestId, role: HostRole): Promise<boolean> {
  const [member] = await transaction
    .select({ isSpectator: schema.roomMembers.isSpectator })
    .from(schema.roomMembers)
    .where(and(eq(schema.roomMembers.roomId, roomId), eq(schema.roomMembers.guestId, guestId)));
  return member?.isSpectator === (role === 'spectator');
}

async function storeRole(transaction: DatabaseTransaction, { roomId, guestId, role, changedAt }: ChangeHostRoleRequest): Promise<void> {
  await transaction
    .update(schema.roomMembers)
    .set({ isSpectator: role === 'spectator' })
    .where(and(eq(schema.roomMembers.roomId, roomId), eq(schema.roomMembers.guestId, guestId)));
  await recordLobbyActivity(transaction, roomId, changedAt);
  await bumpRevision(transaction, roomId);
}
