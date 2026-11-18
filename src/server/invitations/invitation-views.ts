import { asc, eq } from 'drizzle-orm';
import type { InvitationView } from '@/domain/invitation';
import type { RoomId } from '@/domain/room-id';
import * as schema from '../db/schema';
import type { Database } from '../db/types';

// The host's list, oldest link first, naming whoever used each one; the token hash never leaves the server.
export async function findInvitationViews(database: Database, roomId: RoomId): Promise<InvitationView[]> {
  const rows = await database
    .select({ id: schema.roomInvitations.id, createdAt: schema.roomInvitations.createdAt, usedBy: schema.guests.trainerName })
    .from(schema.roomInvitations)
    .leftJoin(schema.guests, eq(schema.guests.id, schema.roomInvitations.usedByGuestId))
    .where(eq(schema.roomInvitations.roomId, roomId))
    .orderBy(asc(schema.roomInvitations.createdAt), asc(schema.roomInvitations.id));
  return rows.map(({ id, createdAt, usedBy }) => ({ id, createdAt: createdAt.getTime(), usedBy }));
}
