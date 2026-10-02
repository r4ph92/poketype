import { and, count, eq, sql } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import type { RoomPhase } from '@/domain/room-phase';
import type { RoomVisibility } from '@/domain/room-visibility';
import * as schema from '../db/schema';
import type { DatabaseTransaction } from '../db/types';

export type LockedRoom = { id: RoomId; phase: RoomPhase; visibility: RoomVisibility; hostGuestId: GuestId; lastActivityAt: Date };

// The row lock serializes every command on a room, so no one joins after the race starts and a start counts every join.
export async function lockRoom(transaction: DatabaseTransaction, roomId: RoomId): Promise<LockedRoom | null> {
  const [room] = await transaction
    .select({
      id: schema.rooms.id,
      phase: schema.rooms.phase,
      visibility: schema.rooms.visibility,
      hostGuestId: schema.rooms.hostGuestId,
      lastActivityAt: schema.rooms.lastActivityAt,
    })
    .from(schema.rooms)
    .where(eq(schema.rooms.id, roomId))
    .for('update');
  return room ?? null;
}

export async function isMember(transaction: DatabaseTransaction, roomId: RoomId, guestId: GuestId): Promise<boolean> {
  const [member] = await transaction
    .select({ id: schema.roomMembers.id })
    .from(schema.roomMembers)
    .where(and(eq(schema.roomMembers.roomId, roomId), eq(schema.roomMembers.guestId, guestId)));
  return member !== undefined;
}

export async function countMembers(transaction: DatabaseTransaction, roomId: RoomId): Promise<number> {
  const [row] = await transaction.select({ total: count() }).from(schema.roomMembers).where(eq(schema.roomMembers.roomId, roomId));
  return row?.total ?? 0;
}

export async function bumpRevision(transaction: DatabaseTransaction, roomId: RoomId): Promise<void> {
  await transaction
    .update(schema.rooms)
    .set({ revision: sql`${schema.rooms.revision} + 1` })
    .where(eq(schema.rooms.id, roomId));
}
