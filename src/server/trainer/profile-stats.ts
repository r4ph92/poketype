import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import { oldestFirst, type ProfileSummary, type WpmPoint } from '@/domain/profile-stats';
import * as schema from '../db/schema';
import type { DatabaseExecutor } from '../db/types';
import { findRaceRecords, noRaceRecord, profileStatsOf, stayedToTheEnd } from './race-record';

const { raceParticipants: participant, races: race } = schema;

// The guest identity owns an account's races, so the profile reads only the id the caller took from the session.
export async function loadProfileSummary(executor: DatabaseExecutor, guestId: GuestId): Promise<ProfileSummary> {
  const [records, progression] = await Promise.all([findRaceRecords(executor, [guestId]), findWpmProgression(executor, guestId)]);
  return { stats: profileStatsOf(records.get(guestId) ?? noRaceRecord), progression };
}

async function findWpmProgression(executor: DatabaseExecutor, guestId: GuestId): Promise<WpmPoint[]> {
  const rows = await executor
    .select({ raceId: race.id, endedAt: race.endedAt, wpm: participant.grossWpm })
    .from(participant)
    .innerJoin(race, eq(race.id, participant.raceId))
    .where(and(eq(participant.guestId, guestId), isNotNull(race.endedAt), isNotNull(participant.grossWpm), stayedToTheEnd))
    .orderBy(desc(race.endedAt), desc(race.id))
    .limit(gameConfig.profile.chartRaces);
  return oldestFirst(rows.map(toWpmPoint));
}

export type WpmRow = { raceId: string; endedAt: Date | null; wpm: number | null };

export function toWpmPoint(row: WpmRow): WpmPoint {
  if (row.endedAt === null || row.wpm === null) throw new Error(`Race ${row.raceId} is in the WPM chart without an end time or a WPM`);
  return { raceId: row.raceId, endedAt: row.endedAt, wpm: row.wpm };
}
