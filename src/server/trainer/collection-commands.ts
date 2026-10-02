import { and, eq } from 'drizzle-orm';
import type { PokedexDex } from '@/assets/pokedex';
import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import type { StarterDex } from '@/domain/starter';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { lockGuest } from './guest-lock';

export type StarterResult = 'chosen' | 'already-chosen';

export type PartnerResult = 'chosen' | 'not-owned';

// The guest row lock serializes a double submission, so a player gets exactly one starter.
export async function chooseStarter(database: Database, guestId: GuestId, dex: StarterDex): Promise<StarterResult> {
  return database.transaction(async (transaction) => {
    await lockGuest(transaction, guestId);
    if (await ownsAnyPokemon(transaction, guestId)) return 'already-chosen';
    await transaction.insert(schema.ownedPokemon).values({ guestId, dex, level: gameConfig.progression.startingLevel, isPartner: true });
    return 'chosen';
  });
}

export async function choosePartner(database: Database, guestId: GuestId, dex: PokedexDex): Promise<PartnerResult> {
  return database.transaction(async (transaction) => {
    await lockGuest(transaction, guestId);
    if (!(await ownsSpecies(transaction, guestId, dex))) return 'not-owned';
    const { ownedPokemon } = schema;
    await transaction.update(ownedPokemon).set({ isPartner: false }).where(and(eq(ownedPokemon.guestId, guestId), eq(ownedPokemon.isPartner, true)));
    await transaction.update(ownedPokemon).set({ isPartner: true }).where(and(eq(ownedPokemon.guestId, guestId), eq(ownedPokemon.dex, dex)));
    return 'chosen';
  });
}

async function ownsAnyPokemon(transaction: DatabaseTransaction, guestId: GuestId): Promise<boolean> {
  const [owned] = await transaction.select({ id: schema.ownedPokemon.id }).from(schema.ownedPokemon).where(eq(schema.ownedPokemon.guestId, guestId)).limit(1);
  return owned !== undefined;
}

async function ownsSpecies(transaction: DatabaseTransaction, guestId: GuestId, dex: PokedexDex): Promise<boolean> {
  const [owned] = await transaction
    .select({ id: schema.ownedPokemon.id })
    .from(schema.ownedPokemon)
    .where(and(eq(schema.ownedPokemon.guestId, guestId), eq(schema.ownedPokemon.dex, dex)));
  return owned !== undefined;
}
