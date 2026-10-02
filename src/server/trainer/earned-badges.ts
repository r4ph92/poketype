import { eq } from 'drizzle-orm';
import { gameConfig } from '@/config/game';
import { badgeIds, badgesEarnedAfter, type BadgeId } from '@/domain/badges';
import type { GuestId } from '@/domain/guest-id';
import type { RaceId } from '@/domain/race';
import * as schema from '../db/schema';
import type { DatabaseExecutor, DatabaseTransaction } from '../db/types';
import { creditCoins } from '../shop/wallet';
import { findRaceRecords } from './race-record';

// In milestone order, whatever order they were granted in.
export async function findEarnedBadges(executor: DatabaseExecutor, guestId: GuestId): Promise<BadgeId[]> {
  const rows = await executor.select({ badge: schema.earnedBadges.badge }).from(schema.earnedBadges).where(eq(schema.earnedBadges.guestId, guestId));
  const earned = new Set(rows.map((row) => row.badge));
  return badgeIds.filter((badge) => earned.has(badge));
}

// Runs inside the settlement transaction, after the race is marked ended and the finishers' guest rows are locked, so the count includes this race.
// The primary key turns a repeated grant into nothing, and every badge already due is granted, so a missed milestone catches up.
// Each newly granted badge pays its Poké Dollar bonus with it, once.
export async function grantMilestoneBadges(transaction: DatabaseTransaction, raceId: RaceId, finisherIds: readonly GuestId[]): Promise<void> {
  const records = await findRaceRecords(transaction, finisherIds);
  const grants = finisherIds.flatMap((guestId) => badgesEarnedAfter(records.get(guestId)?.finishedRaces ?? 0).map((badge) => ({ guestId, badge, raceId })));
  if (grants.length === 0) return;
  const granted = await transaction.insert(schema.earnedBadges).values(grants).onConflictDoNothing().returning({ guestId: schema.earnedBadges.guestId, badge: schema.earnedBadges.badge });
  for (const { guestId, badge } of granted) await creditCoins(transaction, { guestId, reason: 'badge', badge, raceId, amount: gameConfig.economy.badgeCoins });
}
