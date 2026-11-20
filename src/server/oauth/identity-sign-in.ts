import { and, eq, inArray, sql } from 'drizzle-orm';
import { gameConfig } from '@/config/game';
import type { OAuthProvider } from '@/domain/oauth-provider';
import { oauthUsernameCandidates } from '@/domain/oauth-username';
import { attachGuestAsUser, insertUserWithNewGuest, retireSessionsOf, type AccountRows } from '../accounts/account-commands';
import { isUniqueViolation, withoutQueryParameters } from '../db/errors';
import * as schema from '../db/schema';
import type { Database, DatabaseExecutor } from '../db/types';
import { findSessionRecord, lockSessionToken } from '../sessions/session-record';
import { insertSession, replaceWithAccountSession } from '../sessions/session-store';
import type { ProviderIdentity } from './provider-client';

export type IdentitySignIn = { provider: OAuthProvider; identity: ProviderIdentity; presentedSessionToken: string | undefined };

export type IdentitySignInResult = { outcome: 'loggedIn' | 'created'; sessionToken: string } | { outcome: 'usernameUnavailable' };

const identityLockSpace = 53;

export async function signInWithIdentity(database: Database, request: IdentitySignIn): Promise<IdentitySignInResult> {
  return attemptSignIn(database, request, gameConfig.account.oauth.signInAttempts);
}

// A concurrent sign-up can take the chosen username between the check and the insert; the next attempt picks another one.
async function attemptSignIn(database: Database, request: IdentitySignIn, attemptsLeft: number): Promise<IdentitySignInResult> {
  try {
    return await database.transaction((transaction) => signInInTransaction(transaction, request));
  } catch (error) {
    if (attemptsLeft > 1 && isUniqueViolation(error, schema.usernameUniqueIndex)) return attemptSignIn(database, request, attemptsLeft - 1);
    throw withoutQueryParameters(error);
  }
}

async function signInInTransaction(executor: DatabaseExecutor, { provider, identity, presentedSessionToken }: IdentitySignIn): Promise<IdentitySignInResult> {
  await lockIdentity(executor, provider, identity.providerUserId);
  await lockSessionToken(executor, presentedSessionToken);
  const existing = await findIdentityAccount(executor, provider, identity.providerUserId);
  if (existing) return { outcome: 'loggedIn', sessionToken: await replaceWithAccountSession(executor, existing, presentedSessionToken) };
  const username = await firstFreeUsername(executor, oauthUsernameCandidates(identity.login, provider));
  if (!username) return { outcome: 'usernameUnavailable' };
  const rows = await openIdentityAccount(executor, username, presentedSessionToken);
  await executor.insert(schema.oauthIdentities).values({ provider, providerUserId: identity.providerUserId, userId: rows.userId });
  const sessionToken = await insertSession(executor, { ...rows, lifetimeHours: gameConfig.account.sessionLifetimeHours });
  return { outcome: 'created', sessionToken };
}

// Two callbacks for the same provider account wait for each other, so the second one finds the identity instead of creating a twin.
async function lockIdentity(executor: DatabaseExecutor, provider: OAuthProvider, providerUserId: string): Promise<void> {
  await executor.execute(sql`select pg_advisory_xact_lock(${identityLockSpace}, hashtext(${`${provider}:${providerUserId}`}))`);
}

async function findIdentityAccount(executor: DatabaseExecutor, provider: OAuthProvider, providerUserId: string): Promise<AccountRows | null> {
  const [account] = await executor
    .select({ userId: schema.users.id, guestId: schema.users.guestId })
    .from(schema.oauthIdentities)
    .innerJoin(schema.users, eq(schema.users.id, schema.oauthIdentities.userId))
    .where(and(eq(schema.oauthIdentities.provider, provider), eq(schema.oauthIdentities.providerUserId, providerUserId)));
  return account ?? null;
}

async function firstFreeUsername(executor: DatabaseExecutor, candidates: string[]): Promise<string | null> {
  const lowered = candidates.map((candidate) => candidate.toLowerCase());
  const taken = await executor
    .select({ key: sql<string>`lower(${schema.users.username})` })
    .from(schema.users)
    .where(inArray(sql`lower(${schema.users.username})`, lowered));
  const takenKeys = new Set(taken.map(({ key }) => key));
  return candidates.find((candidate) => !takenKeys.has(candidate.toLowerCase())) ?? null;
}

// Like signup, a live guest session brings its guest (races, collection, rooms) into the new account; without one a fresh guest is made.
async function openIdentityAccount(executor: DatabaseExecutor, username: string, presentedSessionToken: string | undefined): Promise<AccountRows> {
  const record = await findSessionRecord(executor, presentedSessionToken);
  if (!record || record.guestHasAccount) return insertUserWithNewGuest(executor, username);
  const rows = await attachGuestAsUser(executor, record.guestId, username);
  await retireSessionsOf(executor, rows.guestId);
  return rows;
}
