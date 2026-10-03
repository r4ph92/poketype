import { and, eq } from 'drizzle-orm';
import type { PokedexDex } from '@/assets/pokedex';
import type { GuestId } from '@/domain/guest-id';
import { itemEvolutionOf, type ItemEvolutionResult } from '@/domain/item-evolution';
import type { EvolutionItemId } from '@/domain/shop-item';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { takeOneFromBag } from '../shop/bag';
import { lockGuest } from './guest-lock';
import { findOwnedPokemon } from './owned-pokemon';

export type ItemEvolutionRequest = { guestId: GuestId; pokemonId: string; item: EvolutionItemId };

type Evolution = ItemEvolutionRequest & { from: PokedexDex; into: PokedexDex };

// Under the guest lock, so a double click consumes one item and evolves the Pokémon once.
export async function evolveWithItem(database: Database, request: ItemEvolutionRequest): Promise<ItemEvolutionResult> {
  return database.transaction(async (transaction) => {
    await lockGuest(transaction, request.guestId);
    const pokemon = await findOwnedPokemon(transaction, request.guestId, request.pokemonId);
    const into = pokemon ? itemEvolutionOf(pokemon.dex, request.item) : null;
    if (!pokemon || into === null) return { outcome: 'cannot-use' };
    if (!(await takeOneFromBag(transaction, request.guestId, request.item))) return { outcome: 'no-item' };
    await evolve(transaction, { ...request, from: pokemon.dex, into });
    return { outcome: 'evolved', from: pokemon.dex, into };
  });
}

// The evolved Pokémon keeps its level, XP and partner place.
async function evolve(transaction: DatabaseTransaction, { guestId, pokemonId, item, from, into }: Evolution): Promise<void> {
  const { ownedPokemon } = schema;
  await transaction.update(ownedPokemon).set({ dex: into }).where(and(eq(ownedPokemon.guestId, guestId), eq(ownedPokemon.id, pokemonId)));
  await transaction.insert(schema.itemEvolutions).values({ guestId, item, dexBefore: from, dexAfter: into });
}
