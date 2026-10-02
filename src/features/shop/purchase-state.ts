import type { ShopItemId } from '@/domain/shop-item';

// attempt changes on every answer, so the same message announced twice is still read again.
export type PurchaseState =
  | { outcome: 'none' | 'invalid' | 'insufficient-funds'; attempt: number }
  | { outcome: 'bought'; item: ShopItemId; quantity: number; attempt: number };

export const initialPurchaseState: PurchaseState = { outcome: 'none', attempt: 0 };
