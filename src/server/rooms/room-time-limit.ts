import { eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import { isRoomOpen } from '@/domain/room-phase';
import type { TimeLimit } from '@/domain/time-limit';
import * as schema from '../db/schema';
import type { Database, DatabaseExecutor, DatabaseTransaction } from '../db/types';
import { closeIfIdle, recordLobbyActivity } from './idle-room';
import { bumpRevision, isMember, lockRoom } from './room-rows';

export type ChangeTimeLimitRequest = { roomId: RoomId; guestId: GuestId; timeLimitSeconds: TimeLimit; changedAt: Date };

export type ChangeTimeLimitResult = 'changed' | 'unchanged' | 'race-started' | 'not-host' | 'not-member' | 'not-found';

export async function findTimeLimit(executor: DatabaseExecutor, roomId: RoomId): Promise<TimeLimit> {
  const [room] = await executor.select({ timeLimitSeconds: schema.rooms.timeLimitSeconds }).from(schema.rooms).where(eq(schema.rooms.id, roomId));
  return room?.timeLimitSeconds ?? null;
}

// Like the text settings: only the host, only in the waiting room (after results, once the next race is prepared), and the next start reads it.
export async function changeRoomTimeLimit(database: Database, request: ChangeTimeLimitRequest): Promise<ChangeTimeLimitResult> {
  const { roomId, guestId, timeLimitSeconds, changedAt } = request;
  return database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (!room || !isRoomOpen(room.phase)) return 'not-found';
    if (!(await isMember(transaction, roomId, guestId))) return 'not-member';
    if (await closeIfIdle(transaction, room, changedAt)) return 'not-found';
    if (room.hostGuestId !== guestId) return 'not-host';
    if (room.phase !== 'waiting') return 'race-started';
    if ((await findTimeLimit(transaction, roomId)) === timeLimitSeconds) return 'unchanged';
    await storeTimeLimit(transaction, request);
    return 'changed';
  });
}

async function storeTimeLimit(transaction: DatabaseTransaction, { roomId, timeLimitSeconds, changedAt }: ChangeTimeLimitRequest): Promise<void> {
  await transaction.update(schema.rooms).set({ timeLimitSeconds }).where(eq(schema.rooms.id, roomId));
  await recordLobbyActivity(transaction, roomId, changedAt);
  await bumpRevision(transaction, roomId);
}
