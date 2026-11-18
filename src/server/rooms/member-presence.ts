import { and, eq, lt } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import * as schema from '../db/schema';
import { departedSeenAt } from '@/domain/member-presence';
import type { Database, DatabaseTransaction } from '../db/types';

export type MemberSighting = { roomId: RoomId; guestId: GuestId; seenAt: Date };

// A plain conditional write without the room lock, like a racer's touch: the time only moves forward.
export async function touchMemberPresence(database: Database, { roomId, guestId, seenAt }: MemberSighting): Promise<void> {
  const { roomMembers: member } = schema;
  await database
    .update(member)
    .set({ lastSeenAt: seenAt })
    .where(and(eq(member.roomId, roomId), eq(member.guestId, guestId), lt(member.lastSeenAt, seenAt)));
}

// Runs in the leave's transaction, so a racer who finished and then left can never take over as host while their row stays.
export async function markMemberDeparted(transaction: DatabaseTransaction, roomId: RoomId, guestId: GuestId): Promise<void> {
  await transaction
    .update(schema.roomMembers)
    .set({ lastSeenAt: new Date(departedSeenAt) })
    .where(and(eq(schema.roomMembers.roomId, roomId), eq(schema.roomMembers.guestId, guestId)));
}
