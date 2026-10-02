import { and, eq } from 'drizzle-orm';
import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import type { StarterDex } from '@/domain/starter';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { lockGuest } from './guest-lock';
import { findOwnedPokemon } from './owned-pokemon';

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

export async function choosePartner(database: Database, guestId: GuestId, pokemonId: string): Promise<PartnerResult> {
  return database.transaction(async (transaction) => {
    await lockGuest(transaction, guestId);
    if (!(await findOwnedPokemon(transaction, guestId, pokemonId))) return 'not-owned';
    const { ownedPokemon } = schema;
    await transaction.update(ownedPokemon).set({ isPartner: false }).where(and(eq(ownedPokemon.guestId, guestId), eq(ownedPokemon.isPartner, true)));
    await transaction.update(ownedPokemon).set({ isPartner: true }).where(and(eq(ownedPokemon.guestId, guestId), eq(ownedPokemon.id, pokemonId)));
    return 'chosen';
  });
}

async function ownsAnyPokemon(transaction: DatabaseTransaction, guestId: GuestId): Promise<boolean> {
  const [owned] = await transaction.select({ id: schema.ownedPokemon.id }).from(schema.ownedPokemon).where(eq(schema.ownedPokemon.guestId, guestId)).limit(1);
  return owned !== undefined;
}
