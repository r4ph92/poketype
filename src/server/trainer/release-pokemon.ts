import { eq } from 'drizzle-orm';
import type { PokedexDex } from '@/assets/pokedex';
import type { GuestId } from '@/domain/guest-id';
import * as schema from '../db/schema';
import type { Database, DatabaseExecutor } from '../db/types';
import { lockGuest } from './guest-lock';
import { placeWaitingLegendaries } from './legendary-grants';
import { findOwnedPokemon } from './owned-pokemon';

// partner: the Pokémon racing for the trainer can never be released.
export type ReleaseResult = 'released' | 'partner' | 'not-owned';

// The freed place goes first to a legendary waiting for one.
export async function releasePokemon(database: Database, guestId: GuestId, pokemonId: string): Promise<ReleaseResult> {
  return database.transaction(async (transaction) => {
    await lockGuest(transaction, guestId);
    const pokemon = await findOwnedPokemon(transaction, guestId, pokemonId);
    if (!pokemon) return 'not-owned';
    if (pokemon.isPartner) return 'partner';
    await transaction.delete(schema.ownedPokemon).where(eq(schema.ownedPokemon.id, pokemon.id));
    await transaction.insert(schema.releasedPokemon).values({ guestId, dex: pokemon.dex, level: pokemon.level });
    await placeWaitingLegendaries(transaction, guestId);
    return 'released';
  });
}

export async function findReleasedDexes(executor: DatabaseExecutor, guestId: GuestId): Promise<PokedexDex[]> {
  const rows = await executor.selectDistinct({ dex: schema.releasedPokemon.dex }).from(schema.releasedPokemon).where(eq(schema.releasedPokemon.guestId, guestId));
  return rows.map((row) => row.dex);
}
