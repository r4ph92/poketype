import { and, eq } from 'drizzle-orm';
import type { PokedexDex } from '@/assets/pokedex';
import type { GuestId } from '@/domain/guest-id';
import type { EvolutionStoneId } from '@/domain/shop-item';
import { stoneEvolutionOf, type StoneResult } from '@/domain/stone-evolution';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { takeOneFromBag } from '../shop/bag';
import { lockGuest } from './guest-lock';
import { findOwnedPokemon } from './owned-pokemon';

export type StoneRequest = { guestId: GuestId; pokemonId: string; stone: EvolutionStoneId };

type Evolution = StoneRequest & { from: PokedexDex; into: PokedexDex };

// Under the guest lock, so a double click consumes one stone and evolves the Pokémon once.
export async function evolveWithStone(database: Database, request: StoneRequest): Promise<StoneResult> {
  return database.transaction(async (transaction) => {
    await lockGuest(transaction, request.guestId);
    const pokemon = await findOwnedPokemon(transaction, request.guestId, request.pokemonId);
    const into = pokemon ? stoneEvolutionOf(pokemon.dex, request.stone) : null;
    if (!pokemon || into === null) return { outcome: 'cannot-use' };
    if (!(await takeOneFromBag(transaction, request.guestId, request.stone))) return { outcome: 'no-stone' };
    await evolve(transaction, { ...request, from: pokemon.dex, into });
    return { outcome: 'evolved', from: pokemon.dex, into };
  });
}

// The evolved Pokémon keeps its level, XP and partner place.
async function evolve(transaction: DatabaseTransaction, { guestId, pokemonId, stone, from, into }: Evolution): Promise<void> {
  const { ownedPokemon } = schema;
  await transaction.update(ownedPokemon).set({ dex: into }).where(and(eq(ownedPokemon.guestId, guestId), eq(ownedPokemon.id, pokemonId)));
  await transaction.insert(schema.stoneEvolutions).values({ guestId, stone, dexBefore: from, dexAfter: into });
}
