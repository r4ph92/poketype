import { eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import * as schema from '../db/schema';
import type { Database } from '../db/types';
import { bumpRoomsOf } from './account-commands';

export async function renameTrainer(database: Database, guestId: GuestId, trainerName: string): Promise<void> {
  await database.transaction(async (transaction) => {
    await transaction.update(schema.guests).set({ trainerName }).where(eq(schema.guests.id, guestId));
    await bumpRoomsOf(transaction, guestId);
  });
}
