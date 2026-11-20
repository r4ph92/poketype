import { eq } from 'drizzle-orm';
import type { RoomId } from '@/domain/room-id';
import type { RoomCloseReason } from '@/domain/room-phase';
import * as schema from '../db/schema';
import type { DatabaseTransaction } from '../db/types';
import { releaseRoomMembers } from './active-membership';
import { bumpRevision } from './room-rows';

// The caller holds the room lock. Members are released so another room can take them; races and rewards are left as they are.
export async function closeLockedRoom(transaction: DatabaseTransaction, roomId: RoomId, closeReason: RoomCloseReason, closedAt: Date): Promise<void> {
  await transaction.update(schema.rooms).set({ phase: 'closed', closeReason }).where(eq(schema.rooms.id, roomId));
  await releaseRoomMembers(transaction, roomId, closedAt);
  await bumpRevision(transaction, roomId);
}
