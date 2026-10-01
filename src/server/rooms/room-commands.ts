import { and, eq, sql } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import { acceptsNewMembers, isRoomOpen, type RoomPhase } from '@/domain/room-phase';
import * as schema from '../db/schema';
import type { Database, Transaction } from '../db/types';

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
    const phase = await lockRoomPhase(transaction, roomId);
    if (!isRoomOpen(phase)) return 'not-found';
    if (await isMember(transaction, roomId, guestId)) return 'already-member';
    if (!acceptsNewMembers(phase)) return 'race-started';
    return addMember(transaction, roomId, guestId);
  });
}

// The row lock serializes joins with phase changes, so no one joins after the race starts.
async function lockRoomPhase(transaction: Transaction, roomId: RoomId): Promise<RoomPhase | null> {
  const [room] = await transaction.select({ phase: schema.rooms.phase }).from(schema.rooms).where(eq(schema.rooms.id, roomId)).for('update');
  return room?.phase ?? null;
}

async function isMember(transaction: Transaction, roomId: RoomId, guestId: GuestId): Promise<boolean> {
  const [member] = await transaction
    .select({ id: schema.roomMembers.id })
    .from(schema.roomMembers)
    .where(and(eq(schema.roomMembers.roomId, roomId), eq(schema.roomMembers.guestId, guestId)));
  return member !== undefined;
}

async function addMember(transaction: Transaction, roomId: RoomId, guestId: GuestId): Promise<JoinResult> {
  const inserted = await transaction
    .insert(schema.roomMembers)
    .values({ roomId, guestId })
    .onConflictDoNothing({ target: [schema.roomMembers.roomId, schema.roomMembers.guestId] })
    .returning({ id: schema.roomMembers.id });
  if (inserted.length === 0) return 'already-member';
  await bumpRevision(transaction, roomId);
  return 'joined';
}

async function bumpRevision(transaction: Transaction, roomId: RoomId): Promise<void> {
  await transaction
    .update(schema.rooms)
    .set({ revision: sql`${schema.rooms.revision} + 1` })
    .where(eq(schema.rooms.id, roomId));
}
