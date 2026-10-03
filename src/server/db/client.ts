import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { readDatabaseUrl } from '../env';
import * as schema from './schema';
import type { Database } from './types';

const globalForDatabase = globalThis as unknown as { openedDatabase?: Database };

let productionDatabase: Database | undefined;

function openDatabase(): Database {
  return drizzle(postgres(readDatabaseUrl()), { schema });
}

function currentDatabase(): Database {
  if (process.env.NODE_ENV === 'production') return (productionDatabase ??= openDatabase());
  return (globalForDatabase.openedDatabase ??= openDatabase());
}

// The connection opens on the first query, so importing this module (during next build) never needs DATABASE_URL.
export const database: Database = new Proxy({} as Database, {
  get(_target, property) {
    const opened = currentDatabase();
    const value = Reflect.get(opened, property) as unknown;
    return typeof value === 'function' ? value.bind(opened) : value;
  },
});
