import { and, eq, ne } from 'drizzle-orm';
import type { PokedexDex } from '@/assets/pokedex';
import type { GuestId } from '@/domain/guest-id';
import { speciesOfDex } from '@/domain/pokemon-catalog';
import type { RaceId } from '@/domain/race';
import type { XpReward } from '@/domain/xp-reward';
import * as schema from '../db/schema';
import type { DatabaseExecutor } from '../db/types';

const { xpGrants, stoneEvolutions } = schema;

// Read from the ledger, never recomputed, so every refresh of the results shows the same grant.
export async function findXpReward(executor: DatabaseExecutor, raceId: RaceId, guestId: GuestId): Promise<XpReward | null> {
  const [grant] = await executor.select().from(xpGrants).where(and(eq(xpGrants.raceId, raceId), eq(xpGrants.guestId, guestId)));
  if (!grant) return null;
  return {
    xp: grant.xp,
    before: { species: speciesOfDex(grant.dexBefore), level: grant.levelBefore, xp: grant.xpBefore },
    after: { species: speciesOfDex(grant.dexAfter), level: grant.levelAfter, xp: grant.xpAfter },
  };
}

// A Pokémon that evolved, by level or by stone, leaves the collection under its old species, which stays caught in the Pokédex.
export async function findEvolvedFromDexes(executor: DatabaseExecutor, guestId: GuestId): Promise<PokedexDex[]> {
  const [byLevel, byStone] = await Promise.all([
    executor.selectDistinct({ dex: xpGrants.dexBefore }).from(xpGrants).where(and(eq(xpGrants.guestId, guestId), ne(xpGrants.dexBefore, xpGrants.dexAfter))),
    executor.selectDistinct({ dex: stoneEvolutions.dexBefore }).from(stoneEvolutions).where(eq(stoneEvolutions.guestId, guestId)),
  ]);
  return [...byLevel, ...byStone].map((row) => row.dex);
}
