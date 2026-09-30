import { seedDatabase } from '../../scripts/seed-database';

export default async function globalSetup(): Promise<void> {
  await seedDatabase(process.env.TEST_DATABASE_URL!);
}
