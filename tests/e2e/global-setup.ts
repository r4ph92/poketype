import type { FullConfig } from '@playwright/test';
import { seedDatabase } from '../../scripts/seed-database';
import warmUpDevServer from './support/warm-up';

export default async function globalSetup(config: FullConfig): Promise<void> {
  await seedDatabase(process.env.TEST_DATABASE_URL!);
  await warmUpDevServer(config);
}
