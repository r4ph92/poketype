import { and, eq, gt, sql } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import { gameConfig } from '@/config/game';
import * as schema from '../db/schema';
import type { Database } from '../db/types';
import { createSessionToken, hashSessionToken, isWellFormedSessionToken } from './session-token';

export type Guest = { id: GuestId; trainerName: string };

export async function createGuestSession(database: Database, trainerName: string): Promise<string> {
  const token = createSessionToken();
  const expiresAt = sql`now() + make_interval(hours => ${gameConfig.guestSessionLifetimeHours})`;
  await database.transaction(async (transaction) => {
    const [guest] = await transaction.insert(schema.guests).values({ trainerName }).returning({ id: schema.guests.id });
    await transaction.insert(schema.sessions).values({ tokenHash: hashSessionToken(token), guestId: guest!.id, expiresAt });
  });
  return token;
}

export async function findGuestBySessionToken(database: Database, token: string | undefined): Promise<Guest | null> {
  if (!isWellFormedSessionToken(token)) return null;
  const [row] = await database
    .select({ id: schema.guests.id, trainerName: schema.guests.trainerName })
    .from(schema.sessions)
    .innerJoin(schema.guests, eq(schema.guests.id, schema.sessions.guestId))
    .where(and(eq(schema.sessions.tokenHash, hashSessionToken(token)), gt(schema.sessions.expiresAt, new Date())));
  return row ?? null;
}

export async function deleteSession(database: Database, token: string | undefined): Promise<void> {
  if (!isWellFormedSessionToken(token)) return;
  await database.delete(schema.sessions).where(eq(schema.sessions.tokenHash, hashSessionToken(token)));
}
