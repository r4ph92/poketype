import { randomBytes } from 'node:crypto';
import { insertAccount } from '../../../src/server/accounts/account-commands';
import { hashPassword } from '../../../src/server/accounts/password-hash';
import type { Database } from '../../../src/server/db/types';
import { hashSessionToken } from '../../../src/server/sessions/session-token';
import { uniquePassword, uniqueUsername } from './accounts';
import { withTestDatabase } from './guests';

export type PasswordAccount = { username: string; password: string; userId: string; guestId: string };

export async function createPasswordAccount(database: Database, prefix = 'Login_'): Promise<PasswordAccount> {
  const username = uniqueUsername(prefix);
  const password = uniquePassword();
  const passwordHash = await hashPassword(password);
  const rows = await database.transaction((transaction) => insertAccount(transaction, { username, passwordHash }));
  return { username, password, ...rows };
}

export async function insertLoginFailures(usernameKey: string, count: number, minutesAgo = 0): Promise<void> {
  await withTestDatabase(async (sql) => {
    for (let index = 0; index < count; index += 1) {
      await sql`insert into login_failures (username_key, failed_at) values (${usernameKey}, now() - make_interval(secs => ${minutesAgo * 60 + index}))`;
    }
  });
}

export async function countLoginFailures(usernameKey: string): Promise<number> {
  return withTestDatabase(async (sql) => {
    const [row] = await sql`select count(*)::int as total from login_failures where username_key = ${usernameKey}`;
    return row!.total as number;
  });
}

export async function insertGuestSessionToken(trainerName: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await withTestDatabase(async (sql) => {
    const [guest] = await sql`insert into guests (trainer_name) values (${trainerName}) returning id`;
    await sql`insert into sessions (token_hash, guest_id, expires_at) values (${hashSessionToken(token)}, ${guest!.id}, now() + interval '1 hour')`;
  });
  return token;
}
