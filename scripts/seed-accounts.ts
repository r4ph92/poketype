import type { StarterDex } from '../src/domain/starter';

export type SeedAccount = { username: string; password: string; starter: StarterDex };

// Test-only credentials for testers and e2e tests; the seed refuses to write them into a non-local database.
export const seedAccounts: readonly SeedAccount[] = [
  { username: 'Maya', password: 'Bulbizarre-Maya-26', starter: 4 },
  { username: 'Leo', password: 'Salameche-Leo-26', starter: 7 },
];
