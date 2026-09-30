import { eq, sql } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import type { UserId } from '@/domain/user-id';
import * as schema from '../db/schema';
import type { DatabaseExecutor } from '../db/types';
import { hashSessionToken, isWellFormedSessionToken } from '../sessions/session-token';

export type SessionRecord = { guestId: GuestId; isExpired: boolean; guestHasAccount: boolean };

// Unlike the login lookup, this also returns expired rows: signup retires a guest's sessions instead of deleting them.
export async function findSessionRecord(executor: DatabaseExecutor, token: string | undefined): Promise<SessionRecord | null> {
  if (!isWellFormedSessionToken(token)) return null;
  const [row] = await executor
    .select({
      guestId: schema.sessions.guestId,
      isExpired: sql<boolean>`${schema.sessions.expiresAt} <= now()`,
      userId: schema.sessions.userId,
      ownerId: schema.users.id,
    })
    .from(schema.sessions)
    .leftJoin(schema.users, eq(schema.users.guestId, schema.sessions.guestId))
    .where(eq(schema.sessions.tokenHash, hashSessionToken(token)));
  if (!row) return null;
  return { guestId: row.guestId, isExpired: row.isExpired, guestHasAccount: row.userId !== null || row.ownerId !== null };
}

export async function lockSessionToken(executor: DatabaseExecutor, token: string | undefined): Promise<void> {
  if (!isWellFormedSessionToken(token)) return;
  await executor.execute(sql`select pg_advisory_xact_lock(hashtext(${hashSessionToken(token)}))`);
}

export type SessionAccountCredential = { guestId: GuestId; userId: UserId; username: string; passwordHash: string };

export async function findAccountCredentialOfSession(executor: DatabaseExecutor, token: string | undefined): Promise<SessionAccountCredential | null> {
  if (!isWellFormedSessionToken(token)) return null;
  const [row] = await executor
    .select({
      guestId: schema.sessions.guestId,
      userId: schema.users.id,
      username: schema.users.username,
      passwordHash: schema.passwordCredentials.passwordHash,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.guestId, schema.sessions.guestId))
    .innerJoin(schema.passwordCredentials, eq(schema.passwordCredentials.userId, schema.users.id))
    .where(eq(schema.sessions.tokenHash, hashSessionToken(token)));
  return row ?? null;
}
