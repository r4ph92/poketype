import { and, eq } from 'drizzle-orm';
import type { PokedexDex } from '@/assets/pokedex';
import type { GuestId } from '@/domain/guest-id';
import type { EvolutionStoneId } from '@/domain/shop-item';
import { stoneEvolutionOf, type StoneResult } from '@/domain/stone-evolution';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { takeOneFromBag } from '../shop/bag';
import { lockGuest } from './guest-lock';

export type StoneRequest = { guestId: GuestId; dex: PokedexDex; stone: EvolutionStoneId };

type Evolution = StoneRequest & { into: PokedexDex };

// Under the guest lock, so a double click consumes one stone and evolves the Pokémon once.
export async function evolveWithStone(database: Database, request: StoneRequest): Promise<StoneResult> {
  const into = stoneEvolutionOf(request.dex, request.stone);
  if (into === null) return { outcome: 'cannot-use' };
  return database.transaction(async (transaction) => {
    await lockGuest(transaction, request.guestId);
    const owned = await findOwnedDexes(transaction, request.guestId);
    if (!owned.has(request.dex)) return { outcome: 'cannot-use' };
    if (owned.has(into)) return { outcome: 'already-owned' };
    if (!(await takeOneFromBag(transaction, request.guestId, request.stone))) return { outcome: 'no-stone' };
    await evolve(transaction, { ...request, into });
    return { outcome: 'evolved', from: request.dex, into };
  });
}

async function findOwnedDexes(transaction: DatabaseTransaction, guestId: GuestId): Promise<Set<number>> {
  const rows = await transaction.select({ dex: schema.ownedPokemon.dex }).from(schema.ownedPokemon).where(eq(schema.ownedPokemon.guestId, guestId));
  return new Set(rows.map((row) => row.dex));
}

// The evolved Pokémon keeps its level, XP and partner place.
async function evolve(transaction: DatabaseTransaction, { guestId, dex, stone, into }: Evolution): Promise<void> {
  const { ownedPokemon } = schema;
  await transaction.update(ownedPokemon).set({ dex: into }).where(and(eq(ownedPokemon.guestId, guestId), eq(ownedPokemon.dex, dex)));
  await transaction.insert(schema.stoneEvolutions).values({ guestId, stone, dexBefore: dex, dexAfter: into });
}
