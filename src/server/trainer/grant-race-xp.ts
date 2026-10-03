import { eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import { rewardPokemon, type PokemonState } from '@/domain/pokemon-reward';
import type { RaceId } from '@/domain/race';
import type { RandomSource } from '@/domain/random-source';
import { countsForRaceRewards } from '@/domain/race-reward';
import { raceXpFor } from '@/domain/race-xp';
import * as schema from '../db/schema';
import type { DatabaseTransaction } from '../db/types';
import { secureRandom } from '../random';
import { lockGuest } from './guest-lock';
import { findOwnedRows } from './owned-pokemon';

// One entry per participant who started the race: partnerPokemonId is the owned Pokémon recorded at the start (null when none, or released since), place is null for an abandoner.
export type RaceXpEntry = { guestId: GuestId; partnerPokemonId: string | null; place: number | null };

type RaceXpGrant = { raceId: RaceId; entry: RaceXpEntry; racers: number; random: RandomSource };

// Runs inside the settlement transaction. Guests are locked in id order, so two rooms settling with the same players never deadlock.
export async function grantRaceXp(transaction: DatabaseTransaction, raceId: RaceId, field: readonly RaceXpEntry[], random: RandomSource = secureRandom): Promise<void> {
  if (!countsForRaceRewards(field.length)) return;
  const inGuestOrder = [...field].sort((first, second) => first.guestId.localeCompare(second.guestId));
  for (const entry of inGuestOrder) await grantXpTo(transaction, { raceId, entry, racers: field.length, random });
}

// The ledger row is written first: when it already exists, the Pokémon is left untouched, so a race never grants twice.
async function grantXpTo(transaction: DatabaseTransaction, { raceId, entry, racers, random }: RaceXpGrant): Promise<void> {
  if (entry.partnerPokemonId === null) return;
  await lockGuest(transaction, entry.guestId);
  const raced = (await findOwnedRows(transaction, entry.guestId)).find((pokemon) => pokemon.id === entry.partnerPokemonId);
  if (!raced) return;
  const xp = raceXpFor(entry.place, racers);
  const rewarded = rewardPokemon(raced, xp, random);
  if (!(await recordGrant(transaction, { raceId, guestId: entry.guestId, xp, before: raced, after: rewarded }))) return;
  await transaction.update(schema.ownedPokemon).set(rewarded).where(eq(schema.ownedPokemon.id, raced.id));
}

type GrantRecord = { raceId: RaceId; guestId: GuestId; xp: number; before: PokemonState; after: PokemonState };

async function recordGrant(transaction: DatabaseTransaction, { raceId, guestId, xp, before, after }: GrantRecord): Promise<boolean> {
  const inserted = await transaction
    .insert(schema.xpGrants)
    .values({ raceId, guestId, xp, dexBefore: before.dex, levelBefore: before.level, xpBefore: before.xp, dexAfter: after.dex, levelAfter: after.level, xpAfter: after.xp })
    .onConflictDoNothing()
    .returning({ raceId: schema.xpGrants.raceId });
  return inserted.length > 0;
}
