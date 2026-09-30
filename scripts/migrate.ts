import { loadEnvConfig } from '@next/env';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { readDatabaseUrl, type DatabaseTarget } from '../src/server/env';

function readTarget(): DatabaseTarget {
  return process.argv.includes('--target=test') ? 'test' : 'default';
}

async function run(): Promise<void> {
  loadEnvConfig(process.cwd());
  const connection = postgres(readDatabaseUrl(readTarget()), { max: 1 });
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
