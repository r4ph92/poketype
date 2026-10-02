import { eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import * as schema from '../db/schema';
import type { DatabaseTransaction } from '../db/types';

// Every change to a guest's collection takes this lock first, so two changes to one collection never interleave.
export async function lockGuest(transaction: DatabaseTransaction, guestId: GuestId): Promise<void> {
  await transaction.select({ id: schema.guests.id }).from(schema.guests).where(eq(schema.guests.id, guestId)).for('update');
}
