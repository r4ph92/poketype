import { idleEndMs } from '@/domain/race-idleness';
import type { RoomId } from '@/domain/room-id';
import type { DatabaseTransaction } from '../db/types';
import { findRaceParticipants, type CurrentRace } from './race-rows';
import { abandonRacersGoneBy } from './race-presence';
import { bumpRevision } from './room-rows';
import { settleRace, settleWhenAllFinished } from './settle-race';

// When the humans still racing have all been silent long enough, from the server's own rows; null while one of them may still type, or when none is racing.
export async function findIdleEnd(transaction: DatabaseTransaction, race: CurrentRace): Promise<Date | null> {
  const racing = (await findRaceParticipants(transaction, race.id)).filter(({ finishedAt, abandonedAt, inactiveAt }) => finishedAt === null && abandonedAt === null && inactiveAt === null);
  const endMs = idleEndMs(racing.map(({ lastReportedAt }) => (lastReportedAt ?? race.startsAt).getTime()));
  return endMs === null ? null : new Date(endMs);
}

// Runs under the room lock once the idle end has passed. A racer already gone 30 s by then is an abandoner, as in the deadline settlement; if that
// leaves nobody racing the race simply ended with its last departure, otherwise it ends where the racers who stayed went quiet.
export async function settleForInactivity(transaction: DatabaseTransaction, roomId: RoomId, race: CurrentRace, idleEnd: Date): Promise<boolean> {
  if (race.endedAt !== null) return false;
  await abandonRacersGoneBy(transaction, race, idleEnd);
  const endedAt = await findIdleEnd(transaction, race);
  const settled = endedAt === null ? await settleWhenAllFinished(transaction, roomId, race) : await settleRace(transaction, { roomId, race, endedAt, endedForInactivity: true });
  if (settled) await bumpRevision(transaction, roomId);
  return settled;
}
