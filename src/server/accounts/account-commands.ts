import { and, eq, gt, inArray, sql } from 'drizzle-orm';
import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import type { UserId } from '@/domain/user-id';
import { isUniqueViolation, withoutQueryParameters } from '../db/errors';
import * as schema from '../db/schema';
import type { Database, DatabaseExecutor } from '../db/types';
import { findSessionRecord, lockSessionToken } from '../sessions/session-record';
import { insertSession } from '../sessions/session-store';

export type NewAccount = { username: string; passwordHash: string };

export type AccountRows = { userId: UserId; guestId: GuestId };

export type OpenAccountResult = { outcome: 'opened'; sessionToken: string } | { outcome: 'usernameTaken' } | { outcome: 'alreadyAccount' };

export async function insertAccount(executor: DatabaseExecutor, account: NewAccount): Promise<AccountRows> {
  const rows = await insertUserWithNewGuest(executor, account.username);
  await insertPasswordCredential(executor, rows.userId, account.passwordHash);
  return rows;
}

export async function insertUserWithNewGuest(executor: DatabaseExecutor, username: string): Promise<AccountRows> {
  const [guest] = await executor.insert(schema.guests).values({ trainerName: username }).returning({ id: schema.guests.id });
  return insertUser(executor, guest!.id, username);
}

export async function openAccount(database: Database, account: NewAccount, replacedSessionToken: string | undefined): Promise<OpenAccountResult> {
  try {
    return await database.transaction((transaction) => openAccountInTransaction(transaction, account, replacedSessionToken));
  } catch (error) {
    if (isUniqueViolation(error, schema.usernameUniqueIndex)) return { outcome: 'usernameTaken' };
    if (isUniqueViolation(error, schema.userGuestUniqueConstraint)) return { outcome: 'alreadyAccount' };
    throw withoutQueryParameters(error);
  }
}

async function openAccountInTransaction(executor: DatabaseExecutor, account: NewAccount, replacedSessionToken: string | undefined): Promise<OpenAccountResult> {
  await lockSessionToken(executor, replacedSessionToken);
  const record = await findSessionRecord(executor, replacedSessionToken);
  if (record?.guestHasAccount) return { outcome: 'alreadyAccount' };
  const rows = record ? await attachGuestAsUser(executor, record.guestId, account.username) : await insertUserWithNewGuest(executor, account.username);
  await insertPasswordCredential(executor, rows.userId, account.passwordHash);
  await retireSessionsOf(executor, rows.guestId);
  const sessionToken = await insertSession(executor, { ...rows, lifetimeHours: gameConfig.account.sessionLifetimeHours });
  return { outcome: 'opened', sessionToken };
}

// Expired rows stay so that a concurrent second submission of the same session is told "already an account" instead of minting a new guest.
export async function retireSessionsOf(executor: DatabaseExecutor, guestId: GuestId): Promise<void> {
  await executor
    .update(schema.sessions)
    .set({ expiresAt: sql`now()` })
    .where(and(eq(schema.sessions.guestId, guestId), gt(schema.sessions.expiresAt, sql`now()`)));
}

// The guest's races, collection and rooms already reference its row, so attaching it is the whole transfer.
export async function attachGuestAsUser(executor: DatabaseExecutor, guestId: GuestId, username: string): Promise<AccountRows> {
  await executor.update(schema.guests).set({ trainerName: username }).where(eq(schema.guests.id, guestId));
  await bumpRoomsOf(executor, guestId);
  return insertUser(executor, guestId, username);
}

export async function bumpRoomsOf(executor: DatabaseExecutor, guestId: GuestId): Promise<void> {
  const memberRooms = executor.select({ roomId: schema.roomMembers.roomId }).from(schema.roomMembers).where(eq(schema.roomMembers.guestId, guestId));
  await executor
    .update(schema.rooms)
    .set({ revision: sql`${schema.rooms.revision} + 1` })
    .where(inArray(schema.rooms.id, memberRooms));
}

async function insertUser(executor: DatabaseExecutor, guestId: GuestId, username: string): Promise<AccountRows> {
  const [user] = await executor.insert(schema.users).values({ username, guestId }).returning({ id: schema.users.id });
  return { userId: user!.id, guestId };
}

async function insertPasswordCredential(executor: DatabaseExecutor, userId: UserId, passwordHash: string): Promise<void> {
  await executor.insert(schema.passwordCredentials).values({ userId, passwordHash });
}
