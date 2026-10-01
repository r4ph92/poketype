import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { insertAccount } from '../src/server/accounts/account-commands';
import { hashPassword } from '../src/server/accounts/password-hash';
import { isUsernameTaken } from '../src/server/accounts/username-availability';
import * as schema from '../src/server/db/schema';
import type { Database } from '../src/server/db/types';
import { seedAccounts, type SeedAccount } from './seed-accounts';

const localHostnames = new Set(['localhost', '127.0.0.1', '[::1]']);

export function isSeedingAllowed(databaseUrl: string, seedAccountsSetting: string | undefined): boolean {
  if (seedAccountsSetting === 'allow') return true;
  return localHostnames.has(new URL(databaseUrl).hostname);
}

export async function seedDatabase(databaseUrl: string): Promise<string[]> {
  if (!isSeedingAllowed(databaseUrl, process.env.SEED_ACCOUNTS)) {
    throw new Error('Refusing to seed demo accounts into a non-local database. Set SEED_ACCOUNTS=allow to override.');
  }
  const connection = postgres(databaseUrl, { max: 1 });
  try {
    return await createMissingAccounts(drizzle(connection, { schema }));
  } finally {
    await connection.end();
  }
}

async function createMissingAccounts(database: Database): Promise<string[]> {
  const created: string[] = [];
  for (const account of seedAccounts) {
    if (await isUsernameTaken(database, account.username)) continue;
    await createAccount(database, account);
    created.push(account.username);
  }
  return created;
}

async function createAccount(database: Database, { username, password }: SeedAccount): Promise<void> {
  const passwordHash = await hashPassword(password);
  await database.transaction((transaction) => insertAccount(transaction, { username, passwordHash }));
}
