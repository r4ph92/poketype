'use client';

import { useActionState, useRef, useState } from 'react';
import type { ShopItemId } from '@/domain/shop-item';
import { buyItemAction } from './buy-item';
import type { Purchase, PurchaseChoice } from './PurchaseDialog';
import { initialPurchaseState, type PurchaseState } from './purchase-state';

// A fresh request key per opened dialog: a double click on "Confirmer" sends the same key twice and is charged once.
export function usePurchaseDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [choice, setChoice] = useState<PurchaseChoice | null>(null);
  const [state, action, pending] = useActionState(async (previous: PurchaseState, submitted: FormData) => {
    const next = await buyItemAction(previous, submitted);
    if (next.outcome === 'bought') dialog.current?.close();
    return next;
  }, initialPurchaseState);

  function choose(item: ShopItemId): void {
    setChoice({ item, purchaseKey: crypto.randomUUID() });
    dialog.current?.showModal();
  }

  const purchase: Purchase = { action, pending, state };
  return { dialog, choice, choose, purchase };
}
