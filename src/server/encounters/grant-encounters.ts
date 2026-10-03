import { and, count, eq } from 'drizzle-orm';
import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import type { RaceId } from '@/domain/race';
import { countsForRaceRewards, type RewardField } from '@/domain/race-reward';
import type { RandomSource } from '@/domain/random-source';
import { drawWildPokemon, earnsEncounter, type WildPokemon } from '@/domain/wild-encounter';
import * as schema from '../db/schema';
import type { DatabaseTransaction } from '../db/types';
import { secureRandom } from '../random';
import type { RacePlacing } from '../trainer/grant-race-coins';

const { wildEncounters } = schema;

type QueuedEncounter = WildPokemon & { guestId: GuestId; raceId: RaceId };

// Runs inside the settlement transaction, after the participants' guest rows are locked. The unique key gives each participant one encounter per race.
// Places count bots, so a player behind three bots is outside the guaranteed places; a bot itself never meets a wild Pokémon.
export async function grantRaceEncounters(transaction: DatabaseTransaction, raceId: RaceId, field: RewardField<RacePlacing>, random: RandomSource = secureRandom): Promise<void> {
  if (!countsForRaceRewards(field.racers)) return;
  const encountered = field.entries.filter(({ place }) => earnsEncounter(place, random));
  for (const { guestId } of encountered) await queueEncounter(transaction, { guestId, raceId, ...drawWildPokemon(random) });
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
