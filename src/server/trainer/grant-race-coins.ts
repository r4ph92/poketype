import type { GuestId } from '@/domain/guest-id';
import type { RaceId } from '@/domain/race';
import { raceCoinsFor } from '@/domain/race-coins';
import { countsForRaceRewards } from '@/domain/race-reward';
import type { DatabaseTransaction } from '../db/types';
import { creditCoins } from '../shop/wallet';

// Everyone who started the race; place is null for an abandoner.
export type RacePlacing = { guestId: GuestId; place: number | null };

// Runs inside the settlement transaction, after the participants' guest rows are locked. An abandoner gets a 0 ₽ entry, so their results say so.
export async function grantRaceCoins(transaction: DatabaseTransaction, raceId: RaceId, field: readonly RacePlacing[]): Promise<void> {
  if (!countsForRaceRewards(field.length)) return;
  for (const { guestId, place } of field) await creditCoins(transaction, { guestId, reason: 'race', raceId, amount: raceCoinsFor(place, field.length) });
}
