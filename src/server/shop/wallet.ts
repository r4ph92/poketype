import { and, eq, gt, inArray, sql } from 'drizzle-orm';
import type { BadgeId } from '@/domain/badges';
import type { CoinReward } from '@/domain/coin-reward';
import type { GuestId } from '@/domain/guest-id';
import type { RaceId } from '@/domain/race';
import type { BagItem } from '@/domain/shop-item';
import * as schema from '../db/schema';
import type { DatabaseExecutor, DatabaseTransaction } from '../db/types';

const { coinEntries, guests, bagItems } = schema;

export type CoinCredit = { guestId: GuestId; amount: number } & (
  | { reason: 'race'; raceId: RaceId }
  | { reason: 'badge'; badge: BadgeId; raceId: RaceId | null }
  | { reason: 'seed' }
);

export type Wallet = { coins: number; bag: BagItem[] };

// The ledger entry is written first: when it already exists the wallet is left untouched, so a payout never happens twice.
export async function creditCoins(transaction: DatabaseTransaction, credit: CoinCredit): Promise<void> {
  const inserted = await transaction.insert(coinEntries).values(credit).onConflictDoNothing().returning({ id: coinEntries.id });
  if (inserted.length === 0) return;
  await changeCoins(transaction, credit.guestId, credit.amount);
}

// A negative change that would leave the wallet below zero fails on the guests_coins_check constraint.
export async function changeCoins(transaction: DatabaseTransaction, guestId: GuestId, amount: number): Promise<void> {
  await transaction.update(guests).set({ coins: sql`${guests.coins} + ${amount}` }).where(eq(guests.id, guestId));
}

export async function findCoins(executor: DatabaseExecutor, guestId: GuestId): Promise<number> {
  const [guest] = await executor.select({ coins: guests.coins }).from(guests).where(eq(guests.id, guestId));
  return guest?.coins ?? 0;
}

export async function findWallet(executor: DatabaseExecutor, guestId: GuestId): Promise<Wallet> {
  const [coins, bag] = await Promise.all([findCoins(executor, guestId), findBag(executor, guestId)]);
  return { coins, bag };
}

// Items whose quantity fell to zero stay as rows but leave the bag.
async function findBag(executor: DatabaseExecutor, guestId: GuestId): Promise<BagItem[]> {
  return executor
    .select({ item: bagItems.item, quantity: bagItems.quantity })
    .from(bagItems)
    .where(and(eq(bagItems.guestId, guestId), gt(bagItems.quantity, 0)))
    .orderBy(bagItems.item);
}

// Read from the ledger, never recomputed, so every refresh of the results shows the same payout. null when the race paid nothing.
export async function findCoinReward(executor: DatabaseExecutor, raceId: RaceId, guestId: GuestId): Promise<CoinReward | null> {
  const entries = await executor
    .select({ reason: coinEntries.reason, amount: coinEntries.amount })
    .from(coinEntries)
    .where(and(eq(coinEntries.raceId, raceId), eq(coinEntries.guestId, guestId), inArray(coinEntries.reason, ['race', 'badge'])));
  const race = entries.find((entry) => entry.reason === 'race');
  if (!race) return null;
  const badges = entries.filter((entry) => entry.reason === 'badge').reduce((total, entry) => total + entry.amount, 0);
  return { race: race.amount, badges };
}
