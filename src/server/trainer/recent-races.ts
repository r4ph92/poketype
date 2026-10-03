import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import type { RecentRace } from '@/domain/trainer-profile';
import * as schema from '../db/schema';
import type { DatabaseExecutor } from '../db/types';

export async function findRecentRaces(executor: DatabaseExecutor, guestId: GuestId): Promise<RecentRace[]> {
  const { raceParticipants: participant, races: race, xpGrants: grant } = schema;
  return executor
    .select({ raceId: race.id, place: participant.place, isInactive: sql<boolean>`${participant.inactiveAt} is not null`, grossWpm: participant.grossWpm, xp: grant.xp })
    .from(participant)
    .innerJoin(race, eq(race.id, participant.raceId))
    .leftJoin(grant, and(eq(grant.raceId, participant.raceId), eq(grant.guestId, participant.guestId)))
    .where(and(eq(participant.guestId, guestId), isNotNull(race.endedAt)))
    .orderBy(desc(race.endedAt), desc(race.id))
    .limit(gameConfig.trainerHub.recentRaces);
}
