import { eq } from 'drizzle-orm';
import type { PokedexDex } from '@/assets/pokedex';
import type { GuestId } from '@/domain/guest-id';
import { rewardPokemon, type PokemonState } from '@/domain/pokemon-reward';
import type { RaceId } from '@/domain/race';
import { countsForXp, raceXpFor } from '@/domain/race-xp';
import * as schema from '../db/schema';
import type { DatabaseTransaction } from '../db/types';
import { lockGuest } from './guest-lock';

// One entry per participant who started the race: partnerDex is the Pokémon recorded at the start, place is null for an abandoner.
export type RaceXpEntry = { guestId: GuestId; partnerDex: PokedexDex | null; place: number | null };

type RaceXpGrant = { raceId: RaceId; entry: RaceXpEntry; racers: number };

type OwnedRow = PokemonState & { id: string };

// Runs inside the settlement transaction. Guests are locked in id order, so two rooms settling with the same players never deadlock.
export async function grantRaceXp(transaction: DatabaseTransaction, raceId: RaceId, field: readonly RaceXpEntry[]): Promise<void> {
  if (!countsForXp(field.length)) return;
  const inGuestOrder = [...field].sort((first, second) => first.guestId.localeCompare(second.guestId));
  for (const entry of inGuestOrder) await grantXpTo(transaction, { raceId, entry, racers: field.length });
}

// The ledger row is written first: when it already exists, the Pokémon is left untouched, so a race never grants twice.
async function grantXpTo(transaction: DatabaseTransaction, { raceId, entry, racers }: RaceXpGrant): Promise<void> {
  if (entry.partnerDex === null) return;
  await lockGuest(transaction, entry.guestId);
  const collection = await findOwnedRows(transaction, entry.guestId);
  const raced = collection.find((pokemon) => pokemon.dex === entry.partnerDex);
  if (!raced) return;
  const xp = raceXpFor(entry.place, racers);
  const rewarded = rewardPokemon(raced, xp, new Set(collection.map((pokemon) => pokemon.dex)));
  if (!(await recordGrant(transaction, { raceId, guestId: entry.guestId, xp, before: raced, after: rewarded }))) return;
  await transaction.update(schema.ownedPokemon).set(rewarded).where(eq(schema.ownedPokemon.id, raced.id));
}

function findOwnedRows(transaction: DatabaseTransaction, guestId: GuestId): Promise<OwnedRow[]> {
  const { ownedPokemon } = schema;
  return transaction.select({ id: ownedPokemon.id, dex: ownedPokemon.dex, level: ownedPokemon.level, xp: ownedPokemon.xp }).from(ownedPokemon).where(eq(ownedPokemon.guestId, guestId));
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
