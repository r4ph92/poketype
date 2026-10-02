import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import type { GuestId } from '../../../src/domain/guest-id';
import * as schema from '../../../src/server/db/schema';
import type { Database } from '../../../src/server/db/types';
import { withTestDatabase } from './guests';

export type IsolatedDatabase = { url: string; database: Database; drop: () => Promise<void> };

// Public rooms are every waiting room in the database, so specs that read the list or place players need a database no other spec writes to.
export async function createIsolatedDatabase(): Promise<IsolatedDatabase> {
  const name = `poketype_isolated_${randomUUID().replaceAll('-', '')}`;
  await withTestDatabase((sql) => sql.unsafe(`create database ${name}`));
  const url = databaseUrlNamed(name);
  const connection = postgres(url, { max: 4, onnotice: () => {} });
  await migrate(drizzle(connection), { migrationsFolder: './drizzle' });
  const drop = async () => {
    await connection.end();
    await withTestDatabase((sql) => sql.unsafe(`drop database if exists ${name} with (force)`));
  };
  return { url, database: drizzle(connection, { schema }), drop };
}

function databaseUrlNamed(name: string): string {
  const url = new URL(process.env.TEST_DATABASE_URL!);
  url.pathname = `/${name}`;
  return url.toString();
}

export async function insertGuestInto(database: Database, trainerName: string): Promise<GuestId> {
  const [guest] = await database.insert(schema.guests).values({ trainerName }).returning({ id: schema.guests.id });
  return guest!.id;
}
