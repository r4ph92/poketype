import { and, eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import * as schema from '../db/schema';
import type { Database } from '../db/types';
import { lockGuest } from '../trainer/guest-lock';

export type LetGoResult = 'let-go' | 'gone';

const { wildEncounters } = schema;

// Under the guest lock, so it never interleaves with a throw at the same encounter.
export async function letEncounterGo(database: Database, guestId: GuestId, encounterId: string): Promise<LetGoResult> {
  return database.transaction(async (transaction) => {
    await lockGuest(transaction, guestId);
    const closed = await transaction
      .update(wildEncounters)
      .set({ status: 'let-go', resolvedAt: new Date() })
      .where(and(eq(wildEncounters.id, encounterId), eq(wildEncounters.guestId, guestId), eq(wildEncounters.status, 'waiting')))
      .returning({ id: wildEncounters.id });
    return closed.length > 0 ? 'let-go' : 'gone';
  });
}
