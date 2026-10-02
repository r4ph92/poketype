import { and, asc, eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import { speciesOfDex } from '@/domain/pokemon-catalog';
import type { RaceId } from '@/domain/race';
import type { RaceEncounter } from '@/domain/race-discoveries';
import type { WaitingEncounter } from '@/domain/trainer-profile';
import * as schema from '../db/schema';
import type { DatabaseExecutor } from '../db/types';

const { wildEncounters } = schema;

// Oldest first: the hub handles the queue one encounter at a time, in the order the races put them there.
export async function findWaitingEncounters(executor: DatabaseExecutor, guestId: GuestId): Promise<WaitingEncounter[]> {
  return executor
    .select({ id: wildEncounters.id, dex: wildEncounters.dex, level: wildEncounters.level, throwsUsed: wildEncounters.throwsUsed })
    .from(wildEncounters)
    .where(and(eq(wildEncounters.guestId, guestId), eq(wildEncounters.status, 'waiting')))
    .orderBy(asc(wildEncounters.createdAt), asc(wildEncounters.id));
}

export async function findRaceEncounter(executor: DatabaseExecutor, raceId: RaceId, guestId: GuestId): Promise<RaceEncounter | null> {
  const [encounter] = await executor
    .select({ dex: wildEncounters.dex, level: wildEncounters.level, status: wildEncounters.status })
    .from(wildEncounters)
    .where(and(eq(wildEncounters.raceId, raceId), eq(wildEncounters.guestId, guestId)));
  return encounter ? { species: speciesOfDex(encounter.dex), level: encounter.level, status: encounter.status } : null;
}
