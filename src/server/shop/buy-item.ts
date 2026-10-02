import { and, eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import { isPcBox, priceOf, type ShopItemId } from '@/domain/shop-item';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { lockGuest } from '../trainer/guest-lock';
import { placeWaitingLegendaries } from '../trainer/legendary-grants';
import { addPcBoxes } from '../trainer/pc-storage';
import { addToBag } from './bag';
import { changeCoins, findCoins } from './wallet';

// purchaseKey names one purchase request: sending it again, as a double click does, charges nothing more.
export type PurchaseRequest = { guestId: GuestId; item: ShopItemId; quantity: number; purchaseKey: string };

export type PurchaseResult = 'bought' | 'insufficient-funds';

// The price comes from the server's catalogue and the balance is read under the guest lock, so the wallet never goes negative.
export async function buyItem(database: Database, request: PurchaseRequest): Promise<PurchaseResult> {
  return database.transaction(async (transaction) => {
    await lockGuest(transaction, request.guestId);
    if (await isAlreadyBought(transaction, request)) return 'bought';
    const cost = priceOf(request.item) * request.quantity;
    if ((await findCoins(transaction, request.guestId)) < cost) return 'insufficient-funds';
    await recordPurchase(transaction, request, cost);
    await changeCoins(transaction, request.guestId, -cost);
    await deliver(transaction, request);
    return 'bought';
  });
}

// A box goes straight into the PC, and its new places go first to legendaries waiting for one.
async function deliver(transaction: DatabaseTransaction, request: PurchaseRequest): Promise<void> {
  if (!isPcBox(request.item)) return addToBag(transaction, request);
  await addPcBoxes(transaction, request.guestId, request.quantity);
  await placeWaitingLegendaries(transaction, request.guestId);
}

async function isAlreadyBought(transaction: DatabaseTransaction, { guestId, purchaseKey }: PurchaseRequest): Promise<boolean> {
  const { coinEntries } = schema;
  const [entry] = await transaction
    .select({ id: coinEntries.id })
    .from(coinEntries)
    .where(and(eq(coinEntries.guestId, guestId), eq(coinEntries.reason, 'purchase'), eq(coinEntries.purchaseKey, purchaseKey)));
  return entry !== undefined;
}

async function recordPurchase(transaction: DatabaseTransaction, { guestId, item, quantity, purchaseKey }: PurchaseRequest, cost: number): Promise<void> {
  await transaction.insert(schema.coinEntries).values({ guestId, reason: 'purchase', amount: -cost, purchaseKey, item, quantity });
}
