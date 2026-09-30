import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { readDatabaseUrl } from '../env';
import * as schema from './schema';

const globalForDatabase = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

function connect(): ReturnType<typeof postgres> {
  return globalForDatabase.sql ?? postgres(readDatabaseUrl());
}

const sql = connect();

if (process.env.NODE_ENV !== 'production') {
  globalForDatabase.sql = sql;
}

export const database = drizzle(sql, { schema });
