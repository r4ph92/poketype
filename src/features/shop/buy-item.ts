'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isShopItemId, parsePurchaseQuantity, type ShopItemId } from '@/domain/shop-item';
import { isCanonicalUuid } from '@/domain/uuid';
import { database } from '@/server/db/client';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { buyItem } from '@/server/shop/buy-item';
import type { PurchaseState } from './purchase-state';

type SubmittedPurchase = { item: ShopItemId; quantity: number; purchaseKey: string };

// Only the item, the quantity and the request key come from the form; the price and the balance are the server's.
export async function buyItemAction(previous: PurchaseState, submitted: FormData): Promise<PurchaseState> {
  const guest = await findCurrentGuest();
  if (!guest) redirect('/');
  const attempt = previous.attempt + 1;
  const purchase = parsePurchase(submitted);
  if (!purchase) return { outcome: 'invalid', attempt };
  const outcome = await buyItem(database, { guestId: guest.id, ...purchase });
  if (outcome === 'insufficient-funds') return { outcome, attempt };
  revalidatePath('/play', 'layout');
  return { outcome, item: purchase.item, quantity: purchase.quantity, attempt };
}

function parsePurchase(submitted: FormData): SubmittedPurchase | null {
  const item = submitted.get('item');
  const quantity = parsePurchaseQuantity(submitted.get('quantity'));
  const purchaseKey = submitted.get('purchaseKey');
  if (!isShopItemId(item) || quantity === null || !isCanonicalUuid(purchaseKey)) return null;
  return { item, quantity, purchaseKey };
}
