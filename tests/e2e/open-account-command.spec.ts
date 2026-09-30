import { randomBytes, randomUUID } from 'node:crypto';
import { test as base, expect } from '@playwright/test';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { openAccount } from '../../src/server/accounts/account-commands';
import { DatabaseQueryError } from '../../src/server/db/errors';
import * as schema from '../../src/server/db/schema';
import type { Database } from '../../src/server/db/types';
import { hashSessionToken } from '../../src/server/sessions/session-token';
import { uniqueUsername } from './support/accounts';

type DatabaseFixture = { database: Database; sql: postgres.Sql };

const test = base.extend<DatabaseFixture>({
  sql: async ({}, provide) => {
    const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 2 });
    await provide(sql);
    await sql.end();
  },
  database: async ({ sql }, provide) => {
    await provide(drizzle(sql, { schema }));
  },
});

const scryptShapedHash = '$scrypt$ln=16,r=8,p=2$c2FsdA$aGFzaA';

async function insertGuestSession(sql: postgres.Sql, trainerName: string): Promise<{ token: string; guestId: string }> {
  const token = randomBytes(32).toString('base64url');
  const [guest] = await sql`insert into guests (trainer_name) values (${trainerName}) returning id`;
  await sql`insert into sessions (token_hash, guest_id, expires_at) values (${hashSessionToken(token)}, ${guest!.id}, now() + interval '1 hour')`;
  return { token, guestId: guest!.id as string };
}

async function countUsers(sql: postgres.Sql, username: string): Promise<number> {
  const [row] = await sql`select count(*)::int as total from users where lower(username) = lower(${username})`;
  return row!.total as number;
}

test.describe('openAccount against the real database', () => {
  test('attaches the guest of the replaced session and swaps its sessions for an account session', async ({ database, sql }) => {
    const username = uniqueUsername();
    const { token, guestId } = await insertGuestSession(sql, 'Invite');

    const result = await openAccount(database, { username, passwordHash: scryptShapedHash }, token);

    expect(result.outcome).toBe('opened');
    const [old] = await sql`select 1 from sessions where token_hash = ${hashSessionToken(token)} and expires_at > now()`;
    expect(old).toBeUndefined();
    const [user] = await sql`select id, guest_id from users where username = ${username}`;
    expect(user!.guest_id).toBe(guestId);
  });

  test('maps a username that differs only by letter case to usernameTaken and saves nothing', async ({ database, sql }) => {
    const username = uniqueUsername('Race_');
    await openAccount(database, { username, passwordHash: scryptShapedHash }, undefined);
    const { token } = await insertGuestSession(sql, 'Invite');

    const result = await openAccount(database, { username: username.toUpperCase(), passwordHash: scryptShapedHash }, token);

    expect(result).toEqual({ outcome: 'usernameTaken' });
    expect(await countUsers(sql, username)).toBe(1);
    const [guest] = await sql`select trainer_name from guests where trainer_name = 'Invite' and id in (select guest_id from sessions where token_hash = ${hashSessionToken(token)})`;
    expect(guest).toBeDefined();
  });

  test('maps a guest that already owns an account to alreadyAccount and saves nothing', async ({ database, sql }) => {
    const { token, guestId } = await insertGuestSession(sql, 'Deux onglets');
    await sql`insert into users (username, guest_id) values (${uniqueUsername()}, ${guestId})`;
    const username = uniqueUsername();

    const result = await openAccount(database, { username, passwordHash: scryptShapedHash }, token);

    expect(result).toEqual({ outcome: 'alreadyAccount' });
    expect(await countUsers(sql, username)).toBe(0);
    const [session] = await sql`select 1 from sessions where token_hash = ${hashSessionToken(token)}`;
    expect(session).toBeDefined();
  });

  test('rethrows any other database failure without the password hash', async ({ database, sql }) => {
    const leakedHash = `not-a-scrypt-hash-${randomUUID()}`;
    const username = uniqueUsername();

    const failure = await openAccount(database, { username, passwordHash: leakedHash }, undefined).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(DatabaseQueryError);
    expect(JSON.stringify(failure) + String((failure as Error).stack) + (failure as Error).message).not.toContain(leakedHash);
    expect(await countUsers(sql, username)).toBe(0);
  });
});

test('a replayed session that signup already retired is told alreadyAccount, not given a new guest', async ({ database, sql }) => {
  const { token } = await insertGuestSession(sql, 'Deux onglets');
  await openAccount(database, { username: uniqueUsername(), passwordHash: scryptShapedHash }, token);
  const username = uniqueUsername();

  const result = await openAccount(database, { username, passwordHash: scryptShapedHash }, token);

  expect(result).toEqual({ outcome: 'alreadyAccount' });
  expect(await countUsers(sql, username)).toBe(0);
});
