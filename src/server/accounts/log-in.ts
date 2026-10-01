import { eq, sql } from 'drizzle-orm';
import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import type { UserId } from '@/domain/user-id';
import { loginUsernameKey } from '@/domain/username';
import { withoutQueryParameters } from '../db/errors';
import * as schema from '../db/schema';
import type { Database } from '../db/types';
import { deleteSession, insertSession } from '../sessions/session-store';
import { dummyPasswordHash } from './dummy-password-hash';
import { checkPasswordThrottled } from './login-throttle';

export type LogInRequest = { username: string; password: string; presentedSessionToken: string | undefined };

export type LogInResult = { outcome: 'loggedIn'; sessionToken: string } | { outcome: 'invalid' } | { outcome: 'throttled' } | { outcome: 'busy' };

type PasswordAccount = { userId: UserId; guestId: GuestId; passwordHash: string };

export async function logInWithPassword(database: Database, request: LogInRequest): Promise<LogInResult> {
  try {
    return await checkCredentials(database, request);
  } catch (error) {
    throw withoutQueryParameters(error);
  }
}

// An unknown username, or an account without a password, is checked against the dummy hash so that every refusal costs one full verification.
async function checkCredentials(database: Database, { username, password, presentedSessionToken }: LogInRequest): Promise<LogInResult> {
  const usernameKey = loginUsernameKey(username);
  const account = await findPasswordAccount(database, usernameKey);
  const check = await checkPasswordThrottled(database, { usernameKey, password, storedHash: account?.passwordHash ?? dummyPasswordHash });
  if (check === 'locked') return { outcome: 'throttled' };
  if (check === 'busy') return { outcome: 'busy' };
  if (check === 'wrong' || !account) return { outcome: 'invalid' };
  return { outcome: 'loggedIn', sessionToken: await replaceSession(database, account, presentedSessionToken) };
}

async function findPasswordAccount(database: Database, usernameKey: string): Promise<PasswordAccount | null> {
  const [account] = await database
    .select({ userId: schema.users.id, guestId: schema.users.guestId, passwordHash: schema.passwordCredentials.passwordHash })
    .from(schema.users)
    .innerJoin(schema.passwordCredentials, eq(schema.passwordCredentials.userId, schema.users.id))
    .where(eq(sql`lower(${schema.users.username})`, usernameKey));
  return account ?? null;
}

async function replaceSession(database: Database, account: PasswordAccount, presentedSessionToken: string | undefined): Promise<string> {
  const lifetimeHours = gameConfig.account.sessionLifetimeHours;
  return database.transaction(async (transaction) => {
    await deleteSession(transaction, presentedSessionToken);
    return insertSession(transaction, { guestId: account.guestId, userId: account.userId, lifetimeHours });
  });
}
