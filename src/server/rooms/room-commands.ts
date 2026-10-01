import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import { acceptsNewMembers, isRoomOpen } from '@/domain/room-phase';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { bumpRevision, isMember, lockRoom } from './room-rows';

export type JoinResult = 'joined' | 'already-member' | 'race-started' | 'not-found';

export async function openRoom(database: Database, hostGuestId: GuestId): Promise<RoomId> {
  return database.transaction(async (transaction) => {
    const [room] = await transaction.insert(schema.rooms).values({ hostGuestId }).returning({ id: schema.rooms.id });
    await transaction.insert(schema.roomMembers).values({ roomId: room!.id, guestId: hostGuestId });
    await bumpRevision(transaction, room!.id);
    return room!.id;
  });
}

export async function joinRoom(database: Database, roomId: RoomId, guestId: GuestId): Promise<JoinResult> {
  return database.transaction(async (transaction) => {
    const phase = (await lockRoom(transaction, roomId))?.phase ?? null;
    if (!isRoomOpen(phase)) return 'not-found';
    if (await isMember(transaction, roomId, guestId)) return 'already-member';
    if (!acceptsNewMembers(phase)) return 'race-started';
    return addMember(transaction, roomId, guestId);
  });
}

async function addMember(transaction: DatabaseTransaction, roomId: RoomId, guestId: GuestId): Promise<JoinResult> {
  const inserted = await transaction
    .insert(schema.roomMembers)
    .values({ roomId, guestId })
    .onConflictDoNothing({ target: [schema.roomMembers.roomId, schema.roomMembers.guestId] })
    .returning({ id: schema.roomMembers.id });
  if (inserted.length === 0) return 'already-member';
  await bumpRevision(transaction, roomId);
  return 'joined';
}
