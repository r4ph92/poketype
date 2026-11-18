import { eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import { isBelowRacers, type RoomCapacity } from '@/domain/room-capacity';
import type { RoomId } from '@/domain/room-id';
import { isRoomOpen } from '@/domain/room-phase';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { closeIfIdle, recordLobbyActivity } from './idle-room';
import { bumpRevision, countRacers, isMember, lockRoom } from './room-rows';

export type ChangeCapacityRequest = { roomId: RoomId; guestId: GuestId; capacity: RoomCapacity; changedAt: Date };

export type ChangeCapacityResult = 'changed' | 'unchanged' | 'below-racers' | 'race-started' | 'not-host' | 'not-member' | 'not-found';

// Like the time limit: only the host, only in the waiting room. Under the room lock no one joins between the count and the update.
export async function changeRoomCapacity(database: Database, request: ChangeCapacityRequest): Promise<ChangeCapacityResult> {
  const { roomId, guestId, capacity, changedAt } = request;
  return database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (!room || !isRoomOpen(room.phase)) return 'not-found';
    if (!(await isMember(transaction, roomId, guestId))) return 'not-member';
    if (await closeIfIdle(transaction, room, changedAt)) return 'not-found';
    if (room.hostGuestId !== guestId) return 'not-host';
    if (room.phase !== 'waiting') return 'race-started';
    if (room.capacity === capacity) return 'unchanged';
    if (isBelowRacers(capacity, await countRacers(transaction, roomId))) return 'below-racers';
    await storeCapacity(transaction, request);
    return 'changed';
  });
}

async function storeCapacity(transaction: DatabaseTransaction, { roomId, capacity, changedAt }: ChangeCapacityRequest): Promise<void> {
  await transaction.update(schema.rooms).set({ capacity }).where(eq(schema.rooms.id, roomId));
  await recordLobbyActivity(transaction, roomId, changedAt);
  await bumpRevision(transaction, roomId);
}
