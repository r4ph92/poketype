import { randomBytes } from 'node:crypto';
import { expect } from '@playwright/test';
import { logInWithPassword, type LogInResult } from '../../src/server/accounts/log-in';
import { hashPassword } from '../../src/server/accounts/password-hash';
import type { Database } from '../../src/server/db/types';
import { findSessionRow, uniquePassword, uniqueUsername } from './support/accounts';
import { commandTest as test } from './support/commands';
import { withTestDatabase } from './support/guests';
import { countLoginFailures, createPasswordAccount, insertGuestSessionToken, insertLoginFailures } from './support/login';

function attempt(database: Database, username: string, password: string, presentedSessionToken?: string): Promise<LogInResult> {
  return logInWithPassword(database, { username, password, presentedSessionToken });
}

const key = (username: string) => username.toLowerCase();

test.describe('logging in with a username and password', () => {
  test('the right password opens an account session on the account guest', async ({ database }) => {
    const account = await createPasswordAccount(database);

    const result = await attempt(database, account.username, account.password);

    expect(result.outcome).toBe('loggedIn');
    const token = (result as { sessionToken: string }).sessionToken;
    expect(await findSessionRow(token)).toEqual({ guestId: account.guestId, userId: account.userId });
  });

  test('the username ignores letter case and surrounding spaces, the password does not', async ({ database }) => {
    const account = await createPasswordAccount(database);

    expect((await attempt(database, `  ${account.username.toUpperCase()} `, account.password)).outcome).toBe('loggedIn');
    expect((await attempt(database, account.username, account.password.toUpperCase())).outcome).toBe('invalid');
    expect((await attempt(database, account.username, ` ${account.password}`)).outcome).toBe('invalid');
  });

  test('a wrong password and an unknown username give the same answer after a full password check', async ({ database }) => {
    const account = await createPasswordAccount(database);
    const unknownStarted = Date.now();
    const unknown = await attempt(database, uniqueUsername('Nobody_'), account.password);
    const unknownMs = Date.now() - unknownStarted;

    const wrong = await attempt(database, account.username, uniquePassword());

    expect(unknown).toEqual({ outcome: 'invalid' });
    expect(wrong).toEqual({ outcome: 'invalid' });
    expect(unknownMs).toBeGreaterThan(100);
  });

  test('an account without a password credential is refused like an unknown username', async ({ database }) => {
    const username = uniqueUsername('NoPass_');
    await withTestDatabase(async (sql) => {
      const [guest] = await sql`insert into guests (trainer_name) values (${username}) returning id`;
      await sql`insert into users (username, guest_id) values (${username}, ${guest!.id})`;
    });

    expect(await attempt(database, username, uniquePassword())).toEqual({ outcome: 'invalid' });
  });

  test('logging in over a guest session deletes that guest session and issues a fresh token', async ({ database }) => {
    const account = await createPasswordAccount(database);
    const guestToken = await insertGuestSessionToken('Invite');

    const result = await attempt(database, account.username, account.password, guestToken);

    expect(result.outcome).toBe('loggedIn');
    expect((result as { sessionToken: string }).sessionToken).not.toBe(guestToken);
    expect(await findSessionRow(guestToken)).toBeNull();
  });
});

test.describe('the login throttle', () => {
  test('after five wrong passwords the right one is refused', async ({ database }) => {
    const account = await createPasswordAccount(database);
    for (let index = 0; index < 5; index += 1) {
      expect(await attempt(database, account.username, uniquePassword())).toEqual({ outcome: 'invalid' });
    }

    expect(await attempt(database, account.username, account.password)).toEqual({ outcome: 'throttled' });
    expect(await attempt(database, account.username.toUpperCase(), account.password)).toEqual({ outcome: 'throttled' });
    expect(await countLoginFailures(key(account.username))).toBe(5);
  });

  test('unknown usernames are counted and locked too', async ({ database }) => {
    const username = uniqueUsername('Ghost_');
    for (let index = 0; index < 5; index += 1) await attempt(database, username, uniquePassword());

    expect(await attempt(database, username, uniquePassword())).toEqual({ outcome: 'throttled' });
  });

  test('a lock ends five minutes after the last failure', async ({ database }) => {
    const account = await createPasswordAccount(database);
    await insertLoginFailures(key(account.username), 5, 4.9);
    expect(await attempt(database, account.username, account.password)).toEqual({ outcome: 'throttled' });

    await withTestDatabase((sql) => sql`update login_failures set failed_at = failed_at - interval '6 seconds' where username_key = ${key(account.username)}`);

    expect((await attempt(database, account.username, account.password)).outcome).toBe('loggedIn');
  });

  test('failures spread over more than five minutes do not lock', async ({ database }) => {
    const account = await createPasswordAccount(database);
    await insertLoginFailures(key(account.username), 1, 6);
    await insertLoginFailures(key(account.username), 3, 1);
    expect(await attempt(database, account.username, uniquePassword())).toEqual({ outcome: 'invalid' });

    expect((await attempt(database, account.username, account.password)).outcome).toBe('loggedIn');
  });

  test('a successful login clears the failures of that username', async ({ database }) => {
    const account = await createPasswordAccount(database);
    await insertLoginFailures(key(account.username), 4);

    expect((await attempt(database, account.username, account.password)).outcome).toBe('loggedIn');
    expect(await countLoginFailures(key(account.username))).toBe(0);
  });

  test('twenty parallel wrong passwords check at most five and then lock', async ({ database }) => {
    const account = await createPasswordAccount(database);

    const results = await Promise.all(Array.from({ length: 20 }, () => attempt(database, account.username, uniquePassword())));

    expect(results.filter((result) => result.outcome === 'loggedIn')).toEqual([]);
    expect(results.filter((result) => result.outcome === 'invalid').length).toBeLessThanOrEqual(5);
    expect(await countLoginFailures(key(account.username))).toBeLessThanOrEqual(5);
    await insertLoginFailures(key(account.username), 5 - (await countLoginFailures(key(account.username))));
    expect(await attempt(database, account.username, account.password)).toEqual({ outcome: 'throttled' });
  });

  test('a login refused because hashing is busy is not counted as a failure', async ({ database }) => {
    const account = await createPasswordAccount(database);
    const filler = Array.from({ length: 10 }, () => hashPassword(randomBytes(8).toString('hex')).catch(() => null));

    const result = await attempt(database, account.username, uniquePassword());
    await Promise.all(filler);

    expect(result).toEqual({ outcome: 'busy' });
    expect(await countLoginFailures(key(account.username))).toBe(0);
  });
});
