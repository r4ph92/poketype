import { eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import { isRoomOpen } from '@/domain/room-phase';
import * as schema from '../db/schema';
import type { Database, DatabaseExecutor, DatabaseTransaction } from '../db/types';
import { closeIfIdle, recordLobbyActivity } from './idle-room';
import { bumpRevision, isMember, lockRoom } from './room-rows';

export type ChangeCatchUpBonusesRequest = { roomId: RoomId; guestId: GuestId; isEnabled: boolean; changedAt: Date };

export type ChangeCatchUpBonusesResult = 'changed' | 'unchanged' | 'race-started' | 'not-host' | 'not-member' | 'not-found';

export async function findCatchUpBonuses(executor: DatabaseExecutor, roomId: RoomId): Promise<boolean> {
  const [room] = await executor.select({ catchUpBonuses: schema.rooms.catchUpBonuses }).from(schema.rooms).where(eq(schema.rooms.id, roomId));
  return room?.catchUpBonuses ?? false;
}

// Like the time limit: only the host, only in the waiting room, and the next start copies it into the race (CONF-09).
export async function changeRoomCatchUpBonuses(database: Database, request: ChangeCatchUpBonusesRequest): Promise<ChangeCatchUpBonusesResult> {
  const { roomId, guestId, isEnabled, changedAt } = request;
  return database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (!room || !isRoomOpen(room.phase)) return 'not-found';
    if (!(await isMember(transaction, roomId, guestId))) return 'not-member';
    if (await closeIfIdle(transaction, room, changedAt)) return 'not-found';
    if (room.hostGuestId !== guestId) return 'not-host';
    if (room.phase !== 'waiting') return 'race-started';
    if ((await findCatchUpBonuses(transaction, roomId)) === isEnabled) return 'unchanged';
    await storeCatchUpBonuses(transaction, request);
    return 'changed';
  });
}

async function storeCatchUpBonuses(transaction: DatabaseTransaction, { roomId, isEnabled, changedAt }: ChangeCatchUpBonusesRequest): Promise<void> {
  await transaction.update(schema.rooms).set({ catchUpBonuses: isEnabled }).where(eq(schema.rooms.id, roomId));
  await recordLobbyActivity(transaction, roomId, changedAt);
  await bumpRevision(transaction, roomId);
}
