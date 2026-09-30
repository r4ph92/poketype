import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import * as schema from '../db/schema';
import type { Database } from '../db/types';

export async function openRoom(database: Database, hostGuestId: GuestId): Promise<RoomId> {
  return database.transaction(async (transaction) => {
    const [room] = await transaction.insert(schema.rooms).values({ hostGuestId }).returning({ id: schema.rooms.id });
    await transaction.insert(schema.roomMembers).values({ roomId: room!.id, guestId: hostGuestId });
    return room!.id;
  });
}
