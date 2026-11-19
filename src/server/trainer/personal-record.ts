import { and, eq, isNotNull, lt, ne, or, sql, type SQL } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import { personalRecordOf, type PersonalRecord } from '@/domain/personal-record';
import type { RaceId } from '@/domain/race';
import * as schema from '../db/schema';
import type { DatabaseExecutor } from '../db/types';
import { stayedToTheEnd } from './race-record';

const { raceParticipants: participant, races: race } = schema;

// Only a race the racer finished counts as a record. A race kind that must not count (the catch-up bonus races, H5) is excluded here, in one place.
const countsTowardRecords = and(isNotNull(participant.finishedAt), isNotNull(participant.grossWpm), stayedToTheEnd);

// Computed from the stored results against the races settled before this one, so a refresh, or a better race run later, never changes the answer.
// The guest identity owns an account's races, so one query covers guests and accounts.
export async function findPersonalRecord(executor: DatabaseExecutor, raceId: RaceId, guestId: GuestId): Promise<PersonalRecord | null> {
  const [current] = await executor
    .select({ grossWpm: participant.grossWpm, endedAt: race.endedAt })
    .from(participant)
    .innerJoin(race, eq(race.id, participant.raceId))
    .where(and(eq(participant.raceId, raceId), eq(participant.guestId, guestId), isNotNull(race.endedAt), countsTowardRecords));
  if (!current || current.grossWpm === null || current.endedAt === null) return null;
  return personalRecordOf(current.grossWpm, await findBestWpmBefore(executor, { raceId, guestId, endedAt: current.endedAt }));
}

type RaceMoment = { raceId: RaceId; guestId: GuestId; endedAt: Date };

async function findBestWpmBefore(executor: DatabaseExecutor, { raceId, guestId, endedAt }: RaceMoment): Promise<number | null> {
  const [best] = await executor
    .select({ bestWpm: sql<number | null>`max(${participant.grossWpm})::float8` })
    .from(participant)
    .innerJoin(race, eq(race.id, participant.raceId))
    .where(and(eq(participant.guestId, guestId), ne(race.id, raceId), settledBefore(endedAt, raceId), countsTowardRecords));
  return best?.bestWpm ?? null;
}

// Races that ended in the same instant are ordered by id, so exactly one of them is the earlier.
function settledBefore(endedAt: Date, raceId: RaceId): SQL | undefined {
  return or(lt(race.endedAt, endedAt), and(eq(race.endedAt, endedAt), lt(race.id, raceId)));
}
