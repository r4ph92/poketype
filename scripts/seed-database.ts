import { inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { insertAccount } from '../src/server/accounts/account-commands';
import { hashPassword } from '../src/server/accounts/password-hash';
import type { GuestId } from '../src/domain/guest-id';
import { loginUsernameKey } from '../src/domain/username';
import * as schema from '../src/server/db/schema';
import type { Database } from '../src/server/db/types';
import { chooseStarter } from '../src/server/trainer/collection-commands';
import { seedAccounts, type SeedAccount } from './seed-accounts';
import { ashUsername, findAccountGuest, seedAsh } from './seed-ash';

const localHostnames = new Set(['localhost', '127.0.0.1', '[::1]']);

export type SeedSettings = { seedAccounts: string | undefined; ashPassword: string | undefined };

// Maya and Leo carry test passwords written in the repository, so they stay local; ash's password comes from the environment, so it may go anywhere.
export type SeedPlan = { demoAccounts: boolean; ashPassword: string | null };

export function isSeedingAllowed(databaseUrl: string, seedAccountsSetting: string | undefined): boolean {
  if (seedAccountsSetting === 'allow') return true;
  return localHostnames.has(new URL(databaseUrl).hostname);
}

export function planSeed(databaseUrl: string, settings: SeedSettings): SeedPlan {
  const plan = { demoAccounts: isSeedingAllowed(databaseUrl, settings.seedAccounts), ashPassword: settings.ashPassword || null };
  if (!plan.demoAccounts && !plan.ashPassword) {
    throw new Error('Refusing to seed demo accounts into a non-local database. Set SEED_ACCOUNTS=allow to override, or SEED_ASH_PASSWORD to seed only ash.');
  }
  return plan;
}

export function readSeedSettings(): SeedSettings {
  return { seedAccounts: process.env.SEED_ACCOUNTS, ashPassword: process.env.SEED_ASH_PASSWORD };
}

export async function seedDatabase(databaseUrl: string, settings: SeedSettings = readSeedSettings()): Promise<string[]> {
  const plan = planSeed(databaseUrl, settings);
  const connection = postgres(databaseUrl, { max: 1 });
  try {
    const database = drizzle(connection, { schema });
    const created = plan.demoAccounts ? await seedDemoAccounts(database) : [];
    if (plan.ashPassword && (await seedAsh(database, plan.ashPassword))) created.push(ashUsername);
    return created;
  } finally {
    await connection.end();
  }
}

async function seedDemoAccounts(database: Database): Promise<string[]> {
  await clearSeedLoginFailures(database);
  const created: string[] = [];
  for (const account of seedAccounts) {
    const { guestId, isNew } = await ensureAccount(database, account);
    await chooseStarter(database, guestId, account.starter);
    if (isNew) created.push(account.username);
  }
  return created;
}

// A test run that locked a seeded account must not leave the next run locked out.
async function clearSeedLoginFailures(database: Database): Promise<void> {
  const usernameKeys = [...seedAccounts.map((account) => account.username), ashUsername].map(loginUsernameKey);
  await database.delete(schema.loginFailures).where(inArray(schema.loginFailures.usernameKey, usernameKeys));
}

async function ensureAccount(database: Database, { username, password }: SeedAccount): Promise<{ guestId: GuestId; isNew: boolean }> {
  const existing = await findAccountGuest(database, username);
  if (existing) return { guestId: existing, isNew: false };
  const passwordHash = await hashPassword(password);
  const { guestId } = await database.transaction((transaction) => insertAccount(transaction, { username, passwordHash }));
  return { guestId, isNew: true };
}
