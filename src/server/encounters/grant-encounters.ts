import { and, count, eq } from 'drizzle-orm';
import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import type { RaceId } from '@/domain/race';
import { countsForRaceRewards } from '@/domain/race-reward';
import { drawWildPokemon, earnsEncounter, type RandomSource, type WildPokemon } from '@/domain/wild-encounter';
import * as schema from '../db/schema';
import type { DatabaseTransaction } from '../db/types';
import { secureRandom } from '../random';
import type { RacePlacing } from '../trainer/grant-race-coins';

const { wildEncounters } = schema;

type QueuedEncounter = WildPokemon & { guestId: GuestId; raceId: RaceId };

// Runs inside the settlement transaction, after the participants' guest rows are locked. The unique key gives each participant one encounter per race.
export async function grantRaceEncounters(transaction: DatabaseTransaction, raceId: RaceId, field: readonly RacePlacing[], random: RandomSource = secureRandom): Promise<void> {
  if (!countsForRaceRewards(field.length)) return;
  const winners = field.filter(({ place }) => earnsEncounter(place, random));
  for (const { guestId } of winners) await queueEncounter(transaction, { guestId, raceId, ...drawWildPokemon(random) });
}

// A full queue drops the new encounter, so a trainer never holds more than maxWaiting.
async function queueEncounter(transaction: DatabaseTransaction, encounter: QueuedEncounter): Promise<void> {
  if ((await countWaiting(transaction, encounter.guestId)) >= gameConfig.encounters.maxWaiting) return;
  await transaction.insert(wildEncounters).values(encounter).onConflictDoNothing();
}

async function countWaiting(transaction: DatabaseTransaction, guestId: GuestId): Promise<number> {
  const [row] = await transaction.select({ total: count() }).from(wildEncounters).where(and(eq(wildEncounters.guestId, guestId), eq(wildEncounters.status, 'waiting')));
  return row?.total ?? 0;
}
