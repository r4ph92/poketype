import { and, eq, gt, inArray, sql } from 'drizzle-orm';
import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import type { UserId } from '@/domain/user-id';
import { isUniqueViolation, withoutQueryParameters } from '../db/errors';
import * as schema from '../db/schema';
import type { Database, DatabaseExecutor } from '../db/types';
import { insertSession } from '../sessions/session-store';
import { findSessionRecord, lockSessionToken } from './session-record';

export type NewAccount = { username: string; passwordHash: string };

export type AccountRows = { userId: UserId; guestId: GuestId };

export type OpenAccountResult = { outcome: 'opened'; sessionToken: string } | { outcome: 'usernameTaken' } | { outcome: 'alreadyAccount' };

export async function insertAccount(executor: DatabaseExecutor, account: NewAccount): Promise<AccountRows> {
  const [guest] = await executor.insert(schema.guests).values({ trainerName: account.username }).returning({ id: schema.guests.id });
  return insertUserAndCredential(executor, guest!.id, account);
}

export async function openAccount(database: Database, account: NewAccount, replacedSessionToken: string | undefined): Promise<OpenAccountResult> {
  try {
    const sessionToken = await database.transaction((transaction) => openAccountInTransaction(transaction, account, replacedSessionToken));
    return sessionToken ? { outcome: 'opened', sessionToken } : { outcome: 'alreadyAccount' };
  } catch (error) {
    if (isUniqueViolation(error, schema.usernameUniqueIndex)) return { outcome: 'usernameTaken' };
    if (isUniqueViolation(error, schema.userGuestUniqueConstraint)) return { outcome: 'alreadyAccount' };
    throw withoutQueryParameters(error);
  }
}

async function openAccountInTransaction(executor: DatabaseExecutor, account: NewAccount, replacedSessionToken: string | undefined): Promise<string | null> {
  await lockSessionToken(executor, replacedSessionToken);
  const record = await findSessionRecord(executor, replacedSessionToken);
  if (record?.guestHasAccount) return null;
  const guestId = record && !record.isExpired ? record.guestId : null;
  const rows = guestId ? await attachGuest(executor, guestId, account) : await insertAccount(executor, account);
  await retireSessionsOf(executor, rows.guestId);
  return insertSession(executor, { ...rows, lifetimeHours: gameConfig.account.sessionLifetimeHours });
}

// Expired rows stay so that a concurrent second submission of the same session is told "already an account" instead of minting a new guest.
async function retireSessionsOf(executor: DatabaseExecutor, guestId: GuestId): Promise<void> {
  await executor
    .update(schema.sessions)
    .set({ expiresAt: sql`now()` })
    .where(and(eq(schema.sessions.guestId, guestId), gt(schema.sessions.expiresAt, sql`now()`)));
}

async function attachGuest(executor: DatabaseExecutor, guestId: GuestId, account: NewAccount): Promise<AccountRows> {
  await executor.update(schema.guests).set({ trainerName: account.username }).where(eq(schema.guests.id, guestId));
  await bumpRoomsOf(executor, guestId);
  return insertUserAndCredential(executor, guestId, account);
}

async function bumpRoomsOf(executor: DatabaseExecutor, guestId: GuestId): Promise<void> {
  const memberRooms = executor.select({ roomId: schema.roomMembers.roomId }).from(schema.roomMembers).where(eq(schema.roomMembers.guestId, guestId));
  await executor
    .update(schema.rooms)
    .set({ revision: sql`${schema.rooms.revision} + 1` })
    .where(inArray(schema.rooms.id, memberRooms));
}

async function insertUserAndCredential(executor: DatabaseExecutor, guestId: GuestId, account: NewAccount): Promise<AccountRows> {
  const [user] = await executor.insert(schema.users).values({ username: account.username, guestId }).returning({ id: schema.users.id });
  await executor.insert(schema.passwordCredentials).values({ userId: user!.id, passwordHash: account.passwordHash });
  return { userId: user!.id, guestId };
}
