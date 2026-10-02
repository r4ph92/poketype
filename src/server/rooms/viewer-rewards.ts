import type { GuestId } from '@/domain/guest-id';
import type { RaceId } from '@/domain/race';
import type { RaceView } from '@/domain/room-view';
import type { DatabaseExecutor } from '../db/types';
import { findRaceEncounter } from '../encounters/encounter-queries';
import { findCoinReward } from '../shop/wallet';
import { findRaceLegendaries } from '../trainer/legendary-queries';
import { findXpReward } from '../trainer/xp-rewards';

export type ViewerRewards = Pick<RaceView, 'reward' | 'coins' | 'encounter' | 'legendaries'>;

export const noViewerRewards: ViewerRewards = { reward: null, coins: null, encounter: null, legendaries: [] };

// Read from the ledgers the settlement wrote, never recomputed, so every refresh of the results shows the same rewards.
export async function findViewerRewards(executor: DatabaseExecutor, raceId: RaceId, viewerGuestId: GuestId): Promise<ViewerRewards> {
  const [reward, coins, encounter, legendaries] = await Promise.all([
    findXpReward(executor, raceId, viewerGuestId),
    findCoinReward(executor, raceId, viewerGuestId),
    findRaceEncounter(executor, raceId, viewerGuestId),
    findRaceLegendaries(executor, raceId, viewerGuestId),
  ]);
  return { reward, coins, encounter, legendaries };
}
