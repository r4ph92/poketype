import { loadEnvConfig } from '@next/env';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../../src/server/db/schema';
import type { Database } from '../../../src/server/db/types';

export type TestDatabase = { database: Database; sql: postgres.Sql };

// Unit tests that need real constraints and locks run against the migrated test database, never the development one.
export function openTestDatabase(): TestDatabase {
  loadEnvConfig(process.cwd());
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL is not set. Copy .env.example to .env and run npm run db:migrate:test.');
  const sql = postgres(url, { max: 4, onnotice: () => {} });
  return { database: drizzle(sql, { schema }), sql };
}
