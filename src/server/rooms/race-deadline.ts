import { isPastDeadline } from '@/domain/race';
import type { RoomId } from '@/domain/room-id';
import { isRaceRunning } from '@/domain/room-phase';
import type { Database, DatabaseTransaction } from '../db/types';
import { findCurrentRace, type CurrentRace } from './race-rows';
import { abandonRacersGoneBy } from './race-presence';
import { bumpRevision, lockRoom } from './room-rows';
import { settleRace } from './settle-race';

// No background job ends races: whichever request first sees the deadline passed settles it, and the room lock with the guarded end makes that happen once.
export async function settleDueRace(database: Database, roomId: RoomId, now: Date): Promise<boolean> {
  return database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (!room || !isRaceRunning(room.phase)) return false;
    const race = await findCurrentRace(transaction, roomId);
    if (!race || !isPastDeadline(race.deadlineAt, now)) return false;
    return settleAtDeadline(transaction, roomId, race);
  });
}

// Unfinished racers are measured at the deadline itself, not when the request arrived, so every path settles the same result.
// A racer already silent 30 s at the deadline counts as an abandoner, as a read just before it would have counted them.
export async function settleAtDeadline(transaction: DatabaseTransaction, roomId: RoomId, race: CurrentRace): Promise<boolean> {
  if (race.endedAt !== null) return false;
  await abandonRacersGoneBy(transaction, race, race.deadlineAt);
  const settled = await settleRace(transaction, { roomId, race, endedAt: race.deadlineAt });
  if (settled) await bumpRevision(transaction, roomId);
  return settled;
}
