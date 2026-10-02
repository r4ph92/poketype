import { and, eq, gte, sql } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import type { ShopItemId } from '@/domain/shop-item';
import * as schema from '../db/schema';
import type { DatabaseTransaction } from '../db/types';

const { bagItems } = schema;

type BagChange = { guestId: GuestId; item: ShopItemId; quantity: number };

export async function addToBag(transaction: DatabaseTransaction, { guestId, item, quantity }: BagChange): Promise<void> {
  await transaction
    .insert(bagItems)
    .values({ guestId, item, quantity })
    .onConflictDoUpdate({ target: [bagItems.guestId, bagItems.item], set: { quantity: sql`${bagItems.quantity} + ${quantity}` } });
}

// Takes one item only when the bag holds one; false when it holds none.
export async function takeOneFromBag(transaction: DatabaseTransaction, guestId: GuestId, item: ShopItemId): Promise<boolean> {
  const taken = await transaction
    .update(bagItems)
    .set({ quantity: sql`${bagItems.quantity} - 1` })
    .where(and(eq(bagItems.guestId, guestId), eq(bagItems.item, item), gte(bagItems.quantity, 1)))
    .returning({ item: bagItems.item });
  return taken.length > 0;
}
