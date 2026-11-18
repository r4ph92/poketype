import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import { clampPage, pageCountOf, pageOffset, type RaceHistoryEntry, type RaceHistoryPage } from '@/domain/race-history';
import * as schema from '../db/schema';
import type { DatabaseExecutor } from '../db/types';

const { raceParticipants: participant, races: race } = schema;

const participantCount = sql<number>`(
  (select count(*) from race_participants as humans where humans.race_id = ${race.id})
  + (select count(*) from race_bots as bots where bots.race_id = ${race.id})
)::int`;

const settledByGuest = (guestId: GuestId) => and(eq(participant.guestId, guestId), isNotNull(race.endedAt));

// The guest identity owns an account's races, so the history reads only the id the caller took from the session.
export async function findRaceHistoryPage(executor: DatabaseExecutor, guestId: GuestId, requestedPage: number): Promise<RaceHistoryPage> {
  const totalRaces = await countSettledRaces(executor, guestId);
  const pageCount = pageCountOf(totalRaces);
  const page = clampPage(requestedPage, pageCount);
  return { entries: await selectEntries(executor, guestId, page), page, pageCount };
}

async function countSettledRaces(executor: DatabaseExecutor, guestId: GuestId): Promise<number> {
  const [row] = await executor.select({ total: sql<number>`count(*)::int` }).from(participant).innerJoin(race, eq(race.id, participant.raceId)).where(settledByGuest(guestId));
  return row?.total ?? 0;
}

async function selectEntries(executor: DatabaseExecutor, guestId: GuestId, page: number): Promise<RaceHistoryEntry[]> {
  const rows = await executor
    .select({
      raceId: race.id,
      roomId: race.roomId,
      endedAt: race.endedAt,
      place: participant.place,
      participantCount,
      isAbandoned: sql<boolean>`${participant.abandonedAt} is not null`,
      isInactive: sql<boolean>`${participant.inactiveAt} is not null`,
      grossWpm: participant.grossWpm,
      accuracy: participant.accuracy,
      textLanguage: race.textLanguage,
    })
    .from(participant)
    .innerJoin(race, eq(race.id, participant.raceId))
    .where(settledByGuest(guestId))
    .orderBy(desc(race.endedAt), desc(race.id))
    .limit(gameConfig.raceHistory.pageSize)
    .offset(pageOffset(page));
  return rows.map(toEntry);
}

export type HistoryRow = Omit<RaceHistoryEntry, 'endedAt'> & { endedAt: Date | null };

export function toEntry(row: HistoryRow): RaceHistoryEntry {
  if (row.endedAt === null) throw new Error(`Race ${row.raceId} is in the history without an end time`);
  return { ...row, endedAt: row.endedAt };
}
