import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import * as schema from '../db/schema';
import { isUniqueViolation } from '../db/errors';
import type { DatabaseExecutor, DatabaseTransaction } from '../db/types';

// One room at a time (SALLE-06): a guest's membership counts until it is deleted or released, and the database holds at most one per guest.
export type InOtherRoom = 'in-other-room';

export const inOtherRoom: InOtherRoom = 'in-other-room';

export async function findActiveRoomId(executor: DatabaseExecutor, guestId: GuestId): Promise<RoomId | null> {
  const [membership] = await executor
    .select({ roomId: schema.roomMembers.roomId })
    .from(schema.roomMembers)
    .where(and(eq(schema.roomMembers.guestId, guestId), isNull(schema.roomMembers.releasedAt)));
  return membership?.roomId ?? null;
}

export async function isActiveInOtherRoom(executor: DatabaseExecutor, guestId: GuestId, roomId: RoomId): Promise<boolean> {
  const activeRoomId = await findActiveRoomId(executor, guestId);
  return activeRoomId !== null && activeRoomId !== roomId;
}

// Two joins to two rooms lock two different rows, so the code check can pass for both; the partial unique index then refuses the second.
export async function refusingSecondRoom<Result>(work: () => Promise<Result>): Promise<Result | InOtherRoom> {
  try {
    return await work();
  } catch (error) {
    if (isUniqueViolation(error, schema.activeMembershipUniqueIndex)) return inOtherRoom;
    throw error;
  }
}

export async function releaseMember(transaction: DatabaseTransaction, roomId: RoomId, guestId: GuestId, releasedAt: Date): Promise<void> {
  await transaction
    .update(schema.roomMembers)
    .set({ releasedAt })
    .where(and(eq(schema.roomMembers.roomId, roomId), eq(schema.roomMembers.guestId, guestId), isNull(schema.roomMembers.releasedAt)));
}

// A closed room keeps its rows for the results history, but nobody is in it any more.
export async function releaseRoomMembers(transaction: DatabaseTransaction, roomId: RoomId, releasedAt: Date): Promise<void> {
  await transaction
    .update(schema.roomMembers)
    .set({ releasedAt })
    .where(and(eq(schema.roomMembers.roomId, roomId), isNull(schema.roomMembers.releasedAt)));
}

export async function reclaimMember(transaction: DatabaseTransaction, roomId: RoomId, guestId: GuestId): Promise<void> {
  await transaction
    .update(schema.roomMembers)
    .set({ releasedAt: null })
    .where(and(eq(schema.roomMembers.roomId, roomId), eq(schema.roomMembers.guestId, guestId), isNotNull(schema.roomMembers.releasedAt)));
}
