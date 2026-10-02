import { and, eq, isNull } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import { isPastDeadline, type RaceId } from '@/domain/race';
import type { RoomId } from '@/domain/room-id';
import { isRaceRunning, isRoomOpen } from '@/domain/room-phase';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { settleAtDeadline } from './race-deadline';
import { findCurrentParticipant, findCurrentRace, type CurrentRace } from './race-rows';
import { bumpRevision, isMember, lockRoom } from './room-rows';
import { settleWhenAllFinished } from './settle-race';

export type AbandonRaceRequest = { roomId: RoomId; guestId: GuestId; abandonedAt: Date };

export type AbandonRaceResult = 'abandoned' | 'already-abandoned' | 'finished' | 'not-racing' | 'not-participant' | 'not-member' | 'not-found';

// The player is always the session's guest, never a name in the request, so nobody can abandon for someone else.
export async function abandonRace(database: Database, request: AbandonRaceRequest): Promise<AbandonRaceResult> {
  const { roomId, guestId } = request;
  return database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (!room || !isRoomOpen(room.phase)) return 'not-found';
    if (!(await isMember(transaction, roomId, guestId))) return 'not-member';
    if (!isRaceRunning(room.phase)) return 'not-racing';
    return abandonCurrentRace(transaction, request);
  });
}

// Runs under the room lock with the room known to be running a race. The abandonment counts as an end of racing for that player,
// so the race settles at once when every other racer is already done. A racer the host removed as inactive who leaves becomes an abandoner,
// so preparing the next race takes them out of the room they left.
export async function abandonCurrentRace(transaction: DatabaseTransaction, { roomId, guestId, abandonedAt }: AbandonRaceRequest): Promise<AbandonRaceResult> {
  const race = await findCurrentRace(transaction, roomId);
  if (!race || race.endedAt !== null) return 'not-racing';
  if (isPastDeadline(race.deadlineAt, abandonedAt)) return settleThenRefuse(transaction, roomId, race);
  const participant = await findCurrentParticipant(transaction, roomId, guestId);
  if (!participant) return 'not-participant';
  if (participant.finishedAt) return 'finished';
  if (participant.abandonedAt) return 'already-abandoned';
  await markAbandoned(transaction, participant.raceId, guestId, abandonedAt);
  await settleWhenAllFinished(transaction, roomId, race);
  await bumpRevision(transaction, roomId);
  return 'abandoned';
}

async function settleThenRefuse(transaction: DatabaseTransaction, roomId: RoomId, race: CurrentRace): Promise<AbandonRaceResult> {
  await settleAtDeadline(transaction, roomId, race);
  return 'not-racing';
}

async function markAbandoned(transaction: DatabaseTransaction, raceId: RaceId, guestId: GuestId, abandonedAt: Date): Promise<void> {
  await transaction
    .update(schema.raceParticipants)
    .set({ abandonedAt, inactiveAt: null })
    .where(and(eq(schema.raceParticipants.raceId, raceId), eq(schema.raceParticipants.guestId, guestId), isNull(schema.raceParticipants.abandonedAt)));
}
