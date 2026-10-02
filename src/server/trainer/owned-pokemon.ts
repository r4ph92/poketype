import { and, eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import type { PokemonState } from '@/domain/pokemon-reward';
import * as schema from '../db/schema';
import type { DatabaseExecutor } from '../db/types';

export type OwnedPokemonRow = PokemonState & { id: string; isPartner: boolean };

const { ownedPokemon } = schema;

const ownedColumns = { id: ownedPokemon.id, dex: ownedPokemon.dex, level: ownedPokemon.level, xp: ownedPokemon.xp, isPartner: ownedPokemon.isPartner };

// null for a Pokémon that is not this trainer's, so a submitted id never reaches another trainer's collection.
export async function findOwnedPokemon(executor: DatabaseExecutor, guestId: GuestId, pokemonId: string): Promise<OwnedPokemonRow | null> {
  const [pokemon] = await executor.select(ownedColumns).from(ownedPokemon).where(and(eq(ownedPokemon.guestId, guestId), eq(ownedPokemon.id, pokemonId)));
  return pokemon ?? null;
}

export function findOwnedRows(executor: DatabaseExecutor, guestId: GuestId): Promise<OwnedPokemonRow[]> {
  return executor.select(ownedColumns).from(ownedPokemon).where(eq(ownedPokemon.guestId, guestId));
}
