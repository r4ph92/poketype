export type SeedAccount = { username: string; password: string };

// Test-only credentials for testers and e2e tests; the seed refuses to write them into a non-local database.
export const seedAccounts: readonly SeedAccount[] = [
  { username: 'Maya', password: 'Bulbizarre-Maya-26' },
  { username: 'Leo', password: 'Salameche-Leo-26' },
];
