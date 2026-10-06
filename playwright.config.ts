import { loadEnvConfig } from '@next/env';
import { defineConfig, devices } from '@playwright/test';
import { acceptedConsentState } from './tests/e2e/support/consent';

loadEnvConfig(process.cwd());

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is not set. Copy .env.example to .env and adjust it.');
}

// The push specs prove delivery by push, which polling alone cannot pass, so CI must run them against Soketi.
const pushEnvironment = Object.fromEntries(Object.entries(process.env).filter(([name]) => name.startsWith('PUSHER_'))) as Record<string, string>;
if (process.env.CI && !pushEnvironment.PUSHER_KEY) {
  throw new Error('PUSHER_* is not set. Start Soketi (docker compose up -d soketi) and set the PUSHER_* values from .env.example.');
}

const port = Number(process.env.E2E_PORT ?? 3100);
const serverCommand = process.env.CI ? 'npm run start' : 'npm run dev';

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://localhost:${port}`, trace: 'retain-on-failure', storageState: acceptedConsentState },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `${serverCommand} -- --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    env: { DATABASE_URL: testDatabaseUrl, ...pushEnvironment },
  },
});
