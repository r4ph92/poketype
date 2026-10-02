import { and, asc, eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import { speciesOfDex } from '@/domain/pokemon-catalog';
import type { RaceId } from '@/domain/race';
import type { LegendaryArrival } from '@/domain/race-discoveries';
import type { LegendaryStatus } from '@/domain/trainer-profile';
import * as schema from '../db/schema';
import type { DatabaseExecutor } from '../db/types';

const { legendaryGrants } = schema;

export async function findRaceLegendaries(executor: DatabaseExecutor, raceId: RaceId, guestId: GuestId): Promise<LegendaryArrival[]> {
  const rows = await executor
    .select({ dex: legendaryGrants.dex, claimedAt: legendaryGrants.claimedAt })
    .from(legendaryGrants)
    .where(and(eq(legendaryGrants.raceId, raceId), eq(legendaryGrants.guestId, guestId)))
    .orderBy(asc(legendaryGrants.dex));
  return rows.map(({ dex, claimedAt }) => ({ species: speciesOfDex(dex), isWaiting: claimedAt === null }));
}

export async function findLegendaryStatuses(executor: DatabaseExecutor, guestId: GuestId): Promise<LegendaryStatus[]> {
  const rows = await executor.select({ dex: legendaryGrants.dex, claimedAt: legendaryGrants.claimedAt }).from(legendaryGrants).where(eq(legendaryGrants.guestId, guestId));
  return rows.map(({ dex, claimedAt }) => ({ dex, isWaiting: claimedAt === null }));
}
