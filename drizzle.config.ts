import { loadEnvConfig } from '@next/env';
import { defineConfig } from 'drizzle-kit';
import { readDatabaseUrl } from './src/server/env';

loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: readDatabaseUrl() },
});
