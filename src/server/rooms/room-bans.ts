import { and, eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import * as schema from '../db/schema';
import type { DatabaseTransaction } from '../db/types';

// The one place that says who may never join a room again: the guest the host kicked (an account keeps its guest, so it is banned too).
// Every route that adds a member asks it under the room lock, before it claims or writes anything.
export async function isBanned(transaction: DatabaseTransaction, roomId: RoomId, guestId: GuestId): Promise<boolean> {
  const [ban] = await transaction
    .select({ bannedAt: schema.roomRemovals.removedAt })
    .from(schema.roomRemovals)
    .where(and(eq(schema.roomRemovals.roomId, roomId), eq(schema.roomRemovals.guestId, guestId)));
  return ban !== undefined;
}

export async function banGuest(transaction: DatabaseTransaction, roomId: RoomId, guestId: GuestId, bannedAt: Date): Promise<void> {
  await transaction
    .insert(schema.roomRemovals)
    .values({ roomId, guestId, removedAt: bannedAt })
    .onConflictDoUpdate({ target: [schema.roomRemovals.roomId, schema.roomRemovals.guestId], set: { removedAt: bannedAt } });
}
