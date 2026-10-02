import { eq } from 'drizzle-orm';
import { badgeIds, type BadgeId } from '@/domain/badges';
import type { GuestId } from '@/domain/guest-id';
import * as schema from '../db/schema';
import type { DatabaseExecutor } from '../db/types';

// In milestone order, whatever order they were granted in.
export async function findEarnedBadges(executor: DatabaseExecutor, guestId: GuestId): Promise<BadgeId[]> {
  const rows = await executor.select({ badge: schema.earnedBadges.badge }).from(schema.earnedBadges).where(eq(schema.earnedBadges.guestId, guestId));
  const earned = new Set(rows.map((row) => row.badge));
  return badgeIds.filter((badge) => earned.has(badge));
}
