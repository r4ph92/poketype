import { and, eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import { hostPresenceWorkOf, type HostPresence, type HostPresenceWork } from '@/domain/host-presence';
import { departedSeenAt } from '@/domain/member-presence';
import type { RoomId } from '@/domain/room-id';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { passHostRole } from './host-succession';
import { bumpRevision, lockRoom, type LockedRoom } from './room-rows';

// No background job watches the host (#44): like the idle close, the first read that finds the host's silence past a threshold settles it,
// once, under the room lock. Returns whether the room changed, so the caller announces it.
export async function settleHostPresence(database: Database, roomId: RoomId, now: Date, viewerGuestId: GuestId): Promise<boolean> {
  return database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (!room) return false;
    const presence = await readHostPresence(transaction, room, { viewerGuestId, now });
    const work = hostPresenceWorkOf(presence, now.getTime());
    if (work === null) return false;
    await applyHostPresence(transaction, room, { work, now });
    return true;
  });
}

type Reader = { viewerGuestId: GuestId; now: Date };

// Read under the lock, after the reader's own sighting was written, so a host whose page just came back is never judged on an older time.
// The host reading the room is there now, whatever the stored time says.
async function readHostPresence(transaction: DatabaseTransaction, room: LockedRoom, { viewerGuestId, now }: Reader): Promise<HostPresence> {
  const [row] = await transaction
    .select({ hostAwayAt: schema.rooms.hostAwayAt, hostSinceAt: schema.rooms.hostSinceAt, hostSeenAt: schema.roomMembers.lastSeenAt })
    .from(schema.rooms)
    .leftJoin(schema.roomMembers, and(eq(schema.roomMembers.roomId, schema.rooms.id), eq(schema.roomMembers.guestId, schema.rooms.hostGuestId)))
    .where(eq(schema.rooms.id, room.id));
  const hostSeenAt = room.hostGuestId === viewerGuestId ? now : (row?.hostSeenAt ?? new Date(departedSeenAt));
  const hostSinceAt = row?.hostSinceAt.getTime() ?? departedSeenAt;
  return { phase: room.phase, hostSeenAt: hostSeenAt.getTime(), hostSinceAt, isMarkedAway: row?.hostAwayAt != null };
}

type HostPresenceChange = { work: HostPresenceWork; now: Date };

async function applyHostPresence(transaction: DatabaseTransaction, room: LockedRoom, { work, now }: HostPresenceChange): Promise<void> {
  if (work === 'pass') {
    await passHostRole(transaction, room, now);
    return;
  }
  const hostAwayAt = work === 'mark-away' ? now : null;
  await transaction.update(schema.rooms).set({ hostAwayAt }).where(eq(schema.rooms.id, room.id));
  await bumpRevision(transaction, room.id);
}
