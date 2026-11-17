import { and, eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import type { RoomPhase } from '@/domain/room-phase';
import type { RoomVisibility } from '@/domain/room-visibility';
import * as schema from '../db/schema';
import type { Database } from '../db/types';

export type RoomAccess = { phase: RoomPhase; visibility: RoomVisibility };

// An unlocked read for pages deciding where to send a visitor; joinRoom checks the same rules again under the room lock.
export async function findRoomAccess(database: Database, roomId: RoomId): Promise<RoomAccess | null> {
  const [room] = await database.select({ phase: schema.rooms.phase, visibility: schema.rooms.visibility }).from(schema.rooms).where(eq(schema.rooms.id, roomId));
  return room ?? null;
}

// A private room's members may reopen its link; anyone else needs an invitation.
export async function isOutsideOfPrivateRoom(database: Database, roomId: RoomId, guestId: GuestId): Promise<boolean> {
  const [row] = await database
    .select({ visibility: schema.rooms.visibility, memberId: schema.roomMembers.id })
    .from(schema.rooms)
    .leftJoin(schema.roomMembers, and(eq(schema.roomMembers.roomId, schema.rooms.id), eq(schema.roomMembers.guestId, guestId)))
    .where(eq(schema.rooms.id, roomId));
  return row?.visibility === 'private' && row.memberId === null;
}
