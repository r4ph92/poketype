import { loadEnvConfig } from '@next/env';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { readDatabaseUrl } from '../src/server/env';
import { readDatabaseTarget } from './database-target';

async function run(): Promise<void> {
  loadEnvConfig(process.cwd());
  const connection = postgres(readDatabaseUrl(readDatabaseTarget(process.argv)), { max: 1 });
  try {
    await migrate(drizzle(connection), { migrationsFolder: './drizzle' });
  } finally {
    await connection.end();
  }
}

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
