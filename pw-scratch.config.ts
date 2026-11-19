import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { defineConfig, devices } from '@playwright/test';
import { acceptedConsentState } from './tests/e2e/support/consent';
export default defineConfig({ testDir: 'tests/e2e', testMatch: 'zz-scratch-74.spec.ts', use: { baseURL: 'http://localhost:3974', storageState: acceptedConsentState }, projects: [{ name: 'c', use: { ...devices['Desktop Chrome'], locale: 'fr-CA' } }] });
