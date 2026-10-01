import { randomBytes } from 'node:crypto';
import { test as base, expect } from '@playwright/test';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { openAccount } from '../../src/server/accounts/account-commands';
import { completeReplayedSignUp } from '../../src/server/accounts/complete-replayed-sign-up';
import { hashPassword } from '../../src/server/accounts/password-hash';
import * as schema from '../../src/server/db/schema';
import type { Database } from '../../src/server/db/types';
import { hashSessionToken } from '../../src/server/sessions/session-token';
import { uniquePassword, uniqueUsername } from './support/accounts';

type Fixtures = { database: Database; sql: postgres.Sql };

const test = base.extend<Fixtures>({
  sql: async ({}, provide) => {
    const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 2 });
    await provide(sql);
    await sql.end();
  },
  database: async ({ sql }, provide) => {
    await provide(drizzle(sql, { schema }));
  },
});

type CreatedAccount = { username: string; password: string; retiredToken: string; accountToken: string };

async function createAccountFromGuestSession(database: Database, sql: postgres.Sql): Promise<CreatedAccount> {
  const retiredToken = randomBytes(32).toString('base64url');
  const [guest] = await sql`insert into guests (trainer_name) values ('Invite') returning id`;
  await sql`insert into sessions (token_hash, guest_id, expires_at) values (${hashSessionToken(retiredToken)}, ${guest!.id}, now() + interval '1 hour')`;
  const username = uniqueUsername();
  const password = uniquePassword();
  const opened = await openAccount(database, { username, passwordHash: await hashPassword(password) }, retiredToken);
  if (opened.outcome !== 'opened') throw new Error('account not opened');
  return { username, password, retiredToken, accountToken: opened.sessionToken };
}

async function countAccountSessions(sql: postgres.Sql, username: string): Promise<number> {
  const [row] = await sql`
    select count(*)::int as total from sessions join users on users.id = sessions.user_id
    where users.username = ${username} and sessions.expires_at > now()`;
  return row!.total as number;
}

test.describe('completing a replayed sign up', () => {
  test('the same username in another case and the same password get a fresh account session', async ({ database, sql }) => {
    const { username, password, retiredToken } = await createAccountFromGuestSession(database, sql);
    const before = await countAccountSessions(sql, username);

    const result = await completeReplayedSignUp(database, { username: username.toUpperCase(), password, replacedSessionToken: retiredToken });

    expect(result.outcome).toBe('opened');
    expect(await countAccountSessions(sql, username)).toBe(before + 1);
  });

  test('a wrong password is refused', async ({ database, sql }) => {
    const { username, retiredToken } = await createAccountFromGuestSession(database, sql);

    const result = await completeReplayedSignUp(database, { username, password: uniquePassword(), replacedSessionToken: retiredToken });

    expect(result).toEqual({ outcome: 'refused' });
  });

  test('a different username is refused', async ({ database, sql }) => {
    const { password, retiredToken } = await createAccountFromGuestSession(database, sql);

    const result = await completeReplayedSignUp(database, { username: uniqueUsername(), password, replacedSessionToken: retiredToken });

    expect(result).toEqual({ outcome: 'refused' });
  });

  test('a session retired 61 seconds ago is refused', async ({ database, sql }) => {
    const { username, password, retiredToken } = await createAccountFromGuestSession(database, sql);
    await sql`update sessions set expires_at = now() - interval '61 seconds' where token_hash = ${hashSessionToken(retiredToken)}`;

    const result = await completeReplayedSignUp(database, { username, password, replacedSessionToken: retiredToken });

    expect(result).toEqual({ outcome: 'refused' });
  });

  test('an account session is refused even with the right credentials', async ({ database, sql }) => {
    const { username, password, accountToken } = await createAccountFromGuestSession(database, sql);

    const result = await completeReplayedSignUp(database, { username, password, replacedSessionToken: accountToken });

    expect(result).toEqual({ outcome: 'refused' });
  });

  test('an unknown or missing token is refused', async ({ database, sql }) => {
    const { username, password } = await createAccountFromGuestSession(database, sql);

    const unknown = await completeReplayedSignUp(database, { username, password, replacedSessionToken: randomBytes(32).toString('base64url') });
    const missing = await completeReplayedSignUp(database, { username, password, replacedSessionToken: undefined });

    expect([unknown, missing]).toEqual([{ outcome: 'refused' }, { outcome: 'refused' }]);
  });
});
