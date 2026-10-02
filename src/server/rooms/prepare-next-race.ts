import { and, eq, inArray, isNotNull, ne } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import { isRoomOpen } from '@/domain/room-phase';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { recordLobbyActivity } from './idle-room';
import { findCurrentRace } from './race-rows';
import { bumpRevision, isMember, lockRoom } from './room-rows';

export type PrepareNextRaceRequest = { roomId: RoomId; guestId: GuestId; preparedAt: Date };

export type PrepareNextRaceResult = 'prepared' | 'not-results' | 'not-host' | 'not-member' | 'not-found';

// Only the host, only from the results: the room goes back to waiting with its code and visibility, and the settled race stays as it is.
export async function prepareNextRace(database: Database, request: PrepareNextRaceRequest): Promise<PrepareNextRaceResult> {
  const { roomId, guestId } = request;
  return database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (!room || !isRoomOpen(room.phase)) return 'not-found';
    if (!(await isMember(transaction, roomId, guestId))) return 'not-member';
    if (room.hostGuestId !== guestId) return 'not-host';
    if (room.phase !== 'results') return 'not-results';
    await removeAbandoners(transaction, roomId, guestId);
    await reopenLobby(transaction, request);
    return 'prepared';
  });
}

// Abandoners of the race just shown leave the room with it; the host stays whatever they did, since the room needs its host.
async function removeAbandoners(transaction: DatabaseTransaction, roomId: RoomId, hostGuestId: GuestId): Promise<void> {
  const race = await findCurrentRace(transaction, roomId);
  if (!race) return;
  const abandoners = transaction
    .select({ guestId: schema.raceParticipants.guestId })
    .from(schema.raceParticipants)
    .where(and(eq(schema.raceParticipants.raceId, race.id), isNotNull(schema.raceParticipants.abandonedAt)));
  await transaction
    .delete(schema.roomMembers)
    .where(and(eq(schema.roomMembers.roomId, roomId), ne(schema.roomMembers.guestId, hostGuestId), inArray(schema.roomMembers.guestId, abandoners)));
}

// Preparing counts as lobby activity, so the idle clock starts over and a public room is listed again.
async function reopenLobby(transaction: DatabaseTransaction, { roomId, preparedAt }: PrepareNextRaceRequest): Promise<void> {
  await transaction.update(schema.rooms).set({ phase: 'waiting' }).where(eq(schema.rooms.id, roomId));
  await recordLobbyActivity(transaction, roomId, preparedAt);
  await bumpRevision(transaction, roomId);
}
