import { gameConfig } from '@/config/game';

type ShopItem = (typeof gameConfig.economy.shopItems)[number];

export type ShopItemId = ShopItem['id'];

export type EvolutionStoneId = Extract<ShopItem, { kind: 'stone' }>['id'];

// One line of a trainer's bag: an item and how many they hold, always at least one.
export type BagItem = { item: ShopItemId; quantity: number };

export const shopItemIds: readonly ShopItemId[] = gameConfig.economy.shopItems.map((item) => item.id);

export const evolutionStoneIds: readonly EvolutionStoneId[] = gameConfig.economy.shopItems.flatMap((item) => (item.kind === 'stone' ? [item.id] : []));

export function isShopItemId(value: unknown): value is ShopItemId {
  return typeof value === 'string' && (shopItemIds as readonly string[]).includes(value);
}

export function isEvolutionStoneId(value: unknown): value is EvolutionStoneId {
  return typeof value === 'string' && (evolutionStoneIds as readonly string[]).includes(value);
}

// A PC box is not held in the bag: buying one adds a box to the trainer's PC.
export function isPcBox(item: ShopItemId): boolean {
  return gameConfig.economy.shopItems.find((shopItem) => shopItem.id === item)!.kind === 'box';
}

export function priceOf(item: ShopItemId): number {
  return gameConfig.economy.shopItems.find((shopItem) => shopItem.id === item)!.price;
}

// A submitted quantity counts only as a whole number from 1 to the purchase maximum.
export function parsePurchaseQuantity(value: unknown): number | null {
  const quantity = typeof value === 'string' && /^\d{1,3}$/.test(value) ? Number(value) : NaN;
  return quantity >= 1 && quantity <= gameConfig.economy.maxPurchaseQuantity ? quantity : null;
}

export function quantityInBag(bag: readonly BagItem[], item: ShopItemId): number {
  return bag.find((line) => line.item === item)?.quantity ?? 0;
}
