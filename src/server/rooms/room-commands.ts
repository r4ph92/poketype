import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import { acceptsNewMembers, isRoomOpen } from '@/domain/room-phase';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { closeIfIdle, recordLobbyActivity } from './idle-room';
import { bumpRevision, countMembers, isMember, lockRoom } from './room-rows';

export type JoinRoomRequest = { roomId: RoomId; guestId: GuestId; joinedAt: Date };

export type JoinResult = 'joined' | 'already-member' | 'race-started' | 'full' | 'not-found';

export async function openRoom(database: Database, hostGuestId: GuestId, openedAt: Date): Promise<RoomId> {
  return database.transaction(async (transaction) => {
    const [room] = await transaction.insert(schema.rooms).values({ hostGuestId, lastActivityAt: openedAt }).returning({ id: schema.rooms.id });
    await transaction.insert(schema.roomMembers).values({ roomId: room!.id, guestId: hostGuestId });
    await bumpRevision(transaction, room!.id);
    return room!.id;
  });
}

// A real join restarts the idle clock, so opening the link of an idle room revives it until its close time.
export async function joinRoom(database: Database, request: JoinRoomRequest): Promise<JoinResult> {
  const { roomId, guestId, joinedAt } = request;
  return database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (!room || !isRoomOpen(room.phase) || (await closeIfIdle(transaction, room, joinedAt))) return 'not-found';
    if (await isMember(transaction, roomId, guestId)) return 'already-member';
    if (!acceptsNewMembers(room.phase)) return 'race-started';
    if ((await countMembers(transaction, roomId)) >= gameConfig.rooms.capacity) return 'full';
    return addMember(transaction, request);
  });
}

async function addMember(transaction: DatabaseTransaction, { roomId, guestId, joinedAt }: JoinRoomRequest): Promise<JoinResult> {
  const inserted = await transaction
    .insert(schema.roomMembers)
    .values({ roomId, guestId })
    .onConflictDoNothing({ target: [schema.roomMembers.roomId, schema.roomMembers.guestId] })
    .returning({ id: schema.roomMembers.id });
  if (inserted.length === 0) return 'already-member';
  await recordLobbyActivity(transaction, roomId, joinedAt);
  await bumpRevision(transaction, roomId);
  return 'joined';
}
