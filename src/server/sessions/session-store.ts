import { and, eq, gt, sql } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import type { UserId } from '@/domain/user-id';
import { gameConfig } from '@/config/game';
import * as schema from '../db/schema';
import type { Database, DatabaseExecutor } from '../db/types';
import { createSessionToken, hashSessionToken, isWellFormedSessionToken } from './session-token';

export type Guest = { id: GuestId; trainerName: string };

export type Account = { id: UserId; username: string };

export type SessionIdentity = { guest: Guest; account: Account | null };

export type NewSession = { guestId: GuestId; userId: UserId | null; lifetimeHours: number };

export async function createGuestSession(database: Database, trainerName: string): Promise<string> {
  return database.transaction(async (transaction) => {
    const [guest] = await transaction.insert(schema.guests).values({ trainerName }).returning({ id: schema.guests.id });
    return insertSession(transaction, { guestId: guest!.id, userId: null, lifetimeHours: gameConfig.guestSessionLifetimeHours });
  });
}

export async function insertSession(executor: DatabaseExecutor, { guestId, userId, lifetimeHours }: NewSession): Promise<string> {
  const token = createSessionToken();
  const expiresAt = sql`now() + make_interval(hours => ${lifetimeHours})`;
  await executor.insert(schema.sessions).values({ tokenHash: hashSessionToken(token), guestId, userId, expiresAt });
  return token;
}

export async function findSessionIdentity(database: Database, token: string | undefined): Promise<SessionIdentity | null> {
  if (!isWellFormedSessionToken(token)) return null;
  const [row] = await database
    .select({
      guest: { id: schema.guests.id, trainerName: schema.guests.trainerName },
      accountId: schema.users.id,
      username: schema.users.username,
    })
    .from(schema.sessions)
    .innerJoin(schema.guests, eq(schema.guests.id, schema.sessions.guestId))
    .leftJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.tokenHash, hashSessionToken(token)), gt(schema.sessions.expiresAt, sql`now()`)));
  if (!row) return null;
  const account = row.accountId && row.username ? { id: row.accountId, username: row.username } : null;
  return { guest: row.guest, account };
}

export async function deleteSession(executor: DatabaseExecutor, token: string | undefined): Promise<void> {
  if (!isWellFormedSessionToken(token)) return;
  await executor.delete(schema.sessions).where(eq(schema.sessions.tokenHash, hashSessionToken(token)));
}
