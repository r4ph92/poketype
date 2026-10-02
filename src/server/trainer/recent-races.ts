import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import type { RecentRace } from '@/domain/trainer-profile';
import * as schema from '../db/schema';
import type { DatabaseExecutor } from '../db/types';

export async function findRecentRaces(executor: DatabaseExecutor, guestId: GuestId): Promise<RecentRace[]> {
  const { raceParticipants: participant, races: race } = schema;
  return executor
    .select({ raceId: race.id, place: participant.place, grossWpm: participant.grossWpm })
    .from(participant)
    .innerJoin(race, eq(race.id, participant.raceId))
    .where(and(eq(participant.guestId, guestId), isNotNull(race.endedAt)))
    .orderBy(desc(race.endedAt), desc(race.id))
    .limit(gameConfig.trainerHub.recentRaces);
}
