import { loadEnvConfig } from '@next/env';
import { readDatabaseUrl } from '../src/server/env';
import { readDatabaseTarget } from './database-target';
import { seedDatabase } from './seed-database';

async function run(): Promise<void> {
  loadEnvConfig(process.cwd());
  const created = await seedDatabase(readDatabaseUrl(readDatabaseTarget(process.argv)));
  console.log(created.length > 0 ? `Seed accounts created: ${created.join(', ')}` : 'Seed accounts already exist.');
  if (!process.env.SEED_ASH_PASSWORD) console.log('SEED_ASH_PASSWORD is not set: the ash account was not seeded.');
}

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
