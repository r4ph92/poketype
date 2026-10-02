import { and, eq } from 'drizzle-orm';
import type { PokedexDex } from '@/assets/pokedex';
import type { GuestId } from '@/domain/guest-id';
import * as schema from '../db/schema';
import type { DatabaseExecutor } from '../db/types';

export type Partner = { dex: PokedexDex; level: number };

// A starter is always saved as the partner and choosing another moves the flag, so having a partner means having chosen a starter.
export async function findPartner(executor: DatabaseExecutor, guestId: GuestId): Promise<Partner | null> {
  const [partner] = await executor
    .select({ dex: schema.ownedPokemon.dex, level: schema.ownedPokemon.level })
    .from(schema.ownedPokemon)
    .where(and(eq(schema.ownedPokemon.guestId, guestId), eq(schema.ownedPokemon.isPartner, true)));
  return partner ?? null;
}

export async function hasStarter(executor: DatabaseExecutor, guestId: GuestId): Promise<boolean> {
  return (await findPartner(executor, guestId)) !== null;
}
