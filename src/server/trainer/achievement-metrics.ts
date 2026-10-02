import { countDistinct, count, eq } from 'drizzle-orm';
import type { AchievementMetrics } from '@/config/achievements';
import type { GuestId } from '@/domain/guest-id';
import * as schema from '../db/schema';
import type { DatabaseExecutor } from '../db/types';
import { findRaceRecords, noRaceRecord, type RaceRecord } from './race-record';

type CollectionCounts = { speciesOwned: number; badgesEarned: number };

export function achievementMetricsOf(record: RaceRecord, { speciesOwned, badgesEarned }: CollectionCounts): AchievementMetrics {
  return { finishedRaces: record.finishedRaces, wins: record.wins, accurateRaces: record.accurateRaces, speciesOwned, badgesEarned };
}

// Counts settled races only, so inside a settlement it includes the race being settled.
export async function findAchievementMetrics(executor: DatabaseExecutor, guestId: GuestId): Promise<AchievementMetrics> {
  const records = await findRaceRecords(executor, [guestId]);
  const [species] = await executor.select({ total: countDistinct(schema.ownedPokemon.dex) }).from(schema.ownedPokemon).where(eq(schema.ownedPokemon.guestId, guestId));
  const [badges] = await executor.select({ total: count() }).from(schema.earnedBadges).where(eq(schema.earnedBadges.guestId, guestId));
  return achievementMetricsOf(records.get(guestId) ?? noRaceRecord, { speciesOwned: species?.total ?? 0, badgesEarned: badges?.total ?? 0 });
}
