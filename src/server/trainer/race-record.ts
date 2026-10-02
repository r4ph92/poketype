import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { accurateRaceThreshold } from '@/config/achievements';
import type { GuestId } from '@/domain/guest-id';
import type { TrainerStats } from '@/domain/trainer-profile';
import * as schema from '../db/schema';
import type { DatabaseExecutor } from '../db/types';

// One trainer's settled races: finishedRaces reached the end of the passage, accurateRaces met the accuracy goal.
export type RaceRecord = TrainerStats & { finishedRaces: number; accurateRaces: number };

const { raceParticipants: participant, races: race } = schema;

export async function findRaceRecords(executor: DatabaseExecutor, guestIds: readonly GuestId[]): Promise<Map<GuestId, RaceRecord>> {
  if (guestIds.length === 0) return new Map();
  const rows = await executor
    .select({
      guestId: participant.guestId,
      races: sql<number>`count(*)::int`,
      finishedRaces: sql<number>`(count(*) filter (where ${participant.finishedAt} is not null))::int`,
      wins: sql<number>`(count(*) filter (where ${participant.place} = 1))::int`,
      accurateRaces: sql<number>`(count(*) filter (where ${participant.accuracy} >= ${accurateRaceThreshold}))::int`,
      averageWpm: sql<number | null>`avg(${participant.grossWpm})::float8`,
      accuracy: sql<number | null>`avg(${participant.accuracy})::float8`,
    })
    .from(participant)
    .innerJoin(race, eq(race.id, participant.raceId))
    .where(and(inArray(participant.guestId, [...guestIds]), isNotNull(race.endedAt)))
    .groupBy(participant.guestId);
  return new Map(rows.map(({ guestId, ...record }) => [guestId, record]));
}
