import { eq } from 'drizzle-orm';
import { isLobbyClosingAt, lobbyIdleOf } from '@/domain/lobby-idle';
import type { RoomId } from '@/domain/room-id';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { bumpRevision, lockRoom, type LockedRoom } from './room-rows';

// No background job closes idle rooms: like the race deadline, whichever request first sees the close time passed closes the room, once, under its lock.
export async function closeIdleRoom(database: Database, roomId: RoomId, now: Date): Promise<boolean> {
  return database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    return room ? closeIfIdle(transaction, room, now) : false;
  });
}

// Every command on a waiting room calls this first under the lock, so a room past its close time is never joined, left or started.
export async function closeIfIdle(transaction: DatabaseTransaction, room: LockedRoom, now: Date): Promise<boolean> {
  if (room.phase !== 'waiting' || !isLobbyClosingAt(lobbyIdleOf(room.lastActivityAt), now.getTime())) return false;
  await transaction.update(schema.rooms).set({ phase: 'closed', closeReason: 'idle' }).where(eq(schema.rooms.id, room.id));
  await bumpRevision(transaction, room.id);
  return true;
}

export async function recordLobbyActivity(transaction: DatabaseTransaction, roomId: RoomId, activityAt: Date): Promise<void> {
  await transaction.update(schema.rooms).set({ lastActivityAt: activityAt }).where(eq(schema.rooms.id, roomId));
}
