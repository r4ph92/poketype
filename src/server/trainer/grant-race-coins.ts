import type { GuestId } from '@/domain/guest-id';
import type { RaceId } from '@/domain/race';
import { raceCoinsFor } from '@/domain/race-coins';
import { countsForRaceRewards, type RewardField } from '@/domain/race-reward';
import type { DatabaseTransaction } from '../db/types';
import { creditCoins } from '../shop/wallet';

// A player who started the race; place is null for an abandoner.
export type RacePlacing = { guestId: GuestId; place: number | null };

// Runs inside the settlement transaction, after the participants' guest rows are locked. An abandoner gets a 0 ₽ entry, so their results say so.
export async function grantRaceCoins(transaction: DatabaseTransaction, raceId: RaceId, field: RewardField<RacePlacing>): Promise<void> {
  if (!countsForRaceRewards(field.racers)) return;
  for (const { guestId, place } of field.entries) await creditCoins(transaction, { guestId, reason: 'race', raceId, amount: raceCoinsFor(place, field.racers) });
}
