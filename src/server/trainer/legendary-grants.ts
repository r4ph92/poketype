import { and, asc, eq, isNull } from 'drizzle-orm';
import { legendaryLevel, legendaryRewards, meetsRequirements } from '@/config/achievements';
import type { PokedexDex } from '@/assets/pokedex';
import type { GuestId } from '@/domain/guest-id';
import type { RaceId } from '@/domain/race';
import * as schema from '../db/schema';
import type { DatabaseTransaction } from '../db/types';
import { findAchievementMetrics } from './achievement-metrics';
import { countFreeSlots } from './pc-storage';

const { legendaryGrants } = schema;

// Runs inside the settlement transaction, after the participants' guest rows are locked. The primary key grants each legendary once per trainer.
export async function grantEarnedLegendaries(transaction: DatabaseTransaction, raceId: RaceId, guestIds: readonly GuestId[]): Promise<void> {
  for (const guestId of guestIds) await grantLegendariesTo(transaction, raceId, guestId);
}

// Called under the guest lock whenever a place may have freed; each waiting legendary is claimed once, oldest first.
export async function placeWaitingLegendaries(transaction: DatabaseTransaction, guestId: GuestId): Promise<void> {
  const waiting = await findWaitingDexes(transaction, guestId);
  if (waiting.length === 0) return;
  const places = await countFreeSlots(transaction, guestId);
  for (const dex of waiting.slice(0, places)) await claimLegendary(transaction, guestId, dex);
}

async function grantLegendariesTo(transaction: DatabaseTransaction, raceId: RaceId, guestId: GuestId): Promise<void> {
  const metrics = await findAchievementMetrics(transaction, guestId);
  const earned = legendaryRewards.filter((reward) => meetsRequirements(metrics, reward.requirements));
  if (earned.length === 0) return;
  await transaction.insert(legendaryGrants).values(earned.map(({ dex }) => ({ guestId, dex, raceId }))).onConflictDoNothing();
  await placeWaitingLegendaries(transaction, guestId);
}

async function findWaitingDexes(transaction: DatabaseTransaction, guestId: GuestId): Promise<PokedexDex[]> {
  const rows = await transaction
    .select({ dex: legendaryGrants.dex })
    .from(legendaryGrants)
    .where(and(eq(legendaryGrants.guestId, guestId), isNull(legendaryGrants.claimedAt)))
    .orderBy(asc(legendaryGrants.earnedAt), asc(legendaryGrants.dex));
  return rows.map((row) => row.dex);
}

// The claim is written first: a grant already claimed adds no second Pokémon.
async function claimLegendary(transaction: DatabaseTransaction, guestId: GuestId, dex: PokedexDex): Promise<void> {
  const claimed = await transaction
    .update(legendaryGrants)
    .set({ claimedAt: new Date() })
    .where(and(eq(legendaryGrants.guestId, guestId), eq(legendaryGrants.dex, dex), isNull(legendaryGrants.claimedAt)))
    .returning({ dex: legendaryGrants.dex });
  if (claimed.length === 0) return;
  await transaction.insert(schema.ownedPokemon).values({ guestId, dex, level: legendaryLevel });
}
