import { eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import { isRoomOpen } from '@/domain/room-phase';
import type { RoomVisibility } from '@/domain/room-visibility';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { closeIfIdle, recordLobbyActivity } from './idle-room';
import { bumpRevision, isMember, lockRoom } from './room-rows';

export type ChangeVisibilityRequest = { roomId: RoomId; guestId: GuestId; visibility: RoomVisibility; changedAt: Date };

export type ChangeVisibilityResult = 'changed' | 'unchanged' | 'race-started' | 'not-host' | 'not-member' | 'not-found';

// A switch is lobby activity: it restarts the idle clock like a join does.
export async function changeRoomVisibility(database: Database, request: ChangeVisibilityRequest): Promise<ChangeVisibilityResult> {
  const { roomId, guestId, visibility, changedAt } = request;
  return database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (!room || !isRoomOpen(room.phase)) return 'not-found';
    if (!(await isMember(transaction, roomId, guestId))) return 'not-member';
    if (await closeIfIdle(transaction, room, changedAt)) return 'not-found';
    if (room.hostGuestId !== guestId) return 'not-host';
    if (room.phase !== 'waiting') return 'race-started';
    if (room.visibility === visibility) return 'unchanged';
    await storeVisibility(transaction, request);
    return 'changed';
  });
}

async function storeVisibility(transaction: DatabaseTransaction, { roomId, visibility, changedAt }: ChangeVisibilityRequest): Promise<void> {
  await transaction.update(schema.rooms).set({ visibility }).where(eq(schema.rooms.id, roomId));
  await recordLobbyActivity(transaction, roomId, changedAt);
  await bumpRevision(transaction, roomId);
}
