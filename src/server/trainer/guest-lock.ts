import { eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import * as schema from '../db/schema';
import type { DatabaseTransaction } from '../db/types';

// Every change to a guest's collection, wallet or bag takes this lock first, so two changes to one trainer never interleave.
export async function lockGuest(transaction: DatabaseTransaction, guestId: GuestId): Promise<void> {
  await transaction.select({ id: schema.guests.id }).from(schema.guests).where(eq(schema.guests.id, guestId)).for('update');
}

// Locks in id order, so two transactions locking the same trainers never deadlock.
export async function lockGuests(transaction: DatabaseTransaction, guestIds: readonly GuestId[]): Promise<void> {
  const inIdOrder = [...new Set(guestIds)].sort((first, second) => first.localeCompare(second));
  for (const guestId of inIdOrder) await lockGuest(transaction, guestId);
}
