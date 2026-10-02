import { gameConfig } from '@/config/game';

const { boxSlots } = gameConfig.storage;

export function storageCapacity(boxes: number): number {
  return boxes * boxSlots;
}

export function freeSlots(ownedCount: number, boxes: number): number {
  return Math.max(0, storageCapacity(boxes) - ownedCount);
}

// Never hides a Pokémon: a collection older than the boxes gets as many boxes as it fills.
export function splitIntoBoxes<Pokemon>(collection: readonly Pokemon[], boxes: number): Pokemon[][] {
  const count = Math.max(boxes, Math.ceil(collection.length / boxSlots));
  return Array.from({ length: count }, (_, index) => collection.slice(index * boxSlots, (index + 1) * boxSlots));
}
