import { loadEnvConfig } from '@next/env';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { readDatabaseUrl } from '../src/server/env';
import * as schema from '../src/server/db/schema';
import { readDatabaseTarget } from './database-target';
import { seedPassageCorpus } from './seed-corpus';

// npm run db:seed:corpus: the production build runs it on every deploy, whatever else it seeds.
async function run(): Promise<void> {
  loadEnvConfig(process.cwd());
  const connection = postgres(readDatabaseUrl(readDatabaseTarget(process.argv)), { max: 1 });
  try {
    console.log(`Passage corpus: ${await seedPassageCorpus(drizzle(connection, { schema }))} passages.`);
  } finally {
    await connection.end();
  }
}

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
