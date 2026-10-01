import { loadEnvConfig } from '@next/env';
import { readDatabaseUrl } from '../src/server/env';
import { readDatabaseTarget } from './database-target';
import { seedDatabase } from './seed-database';

async function run(): Promise<void> {
  loadEnvConfig(process.cwd());
  const created = await seedDatabase(readDatabaseUrl(readDatabaseTarget(process.argv)));
  console.log(created.length > 0 ? `Seed accounts created: ${created.join(', ')}` : 'Seed accounts already exist.');
}

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
