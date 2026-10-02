import { count, eq, sql } from 'drizzle-orm';
import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import { freeSlots } from '@/domain/pc-storage';
import * as schema from '../db/schema';
import type { DatabaseExecutor, DatabaseTransaction } from '../db/types';

const { guests, ownedPokemon } = schema;

export async function findPcBoxes(executor: DatabaseExecutor, guestId: GuestId): Promise<number> {
  const [guest] = await executor.select({ pcBoxes: guests.pcBoxes }).from(guests).where(eq(guests.id, guestId));
  return guest?.pcBoxes ?? gameConfig.storage.startingBoxes;
}

// Read under the guest lock by every command that adds a Pokémon, so two of them never fill the same place.
export async function countFreeSlots(executor: DatabaseExecutor, guestId: GuestId): Promise<number> {
  const [owned] = await executor.select({ total: count() }).from(ownedPokemon).where(eq(ownedPokemon.guestId, guestId));
  return freeSlots(owned?.total ?? 0, await findPcBoxes(executor, guestId));
}

export async function addPcBoxes(transaction: DatabaseTransaction, guestId: GuestId, quantity: number): Promise<void> {
  await transaction.update(guests).set({ pcBoxes: sql`${guests.pcBoxes} + ${quantity}` }).where(eq(guests.id, guestId));
}
