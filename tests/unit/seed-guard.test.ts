import { describe, expect, it } from 'vitest';
import { isSeedingAllowed, planSeed } from '../../scripts/seed-database';

describe('isSeedingAllowed', () => {
  it.each(['postgres://me@localhost:5432/poketype', 'postgres://me@127.0.0.1/poketype', 'postgres://me@[::1]:5432/poketype'])(
    'allows a local database: %s',
    (url) => {
      expect(isSeedingAllowed(url, undefined)).toBe(true);
    },
  );

  it.each(['postgres://me@db.example.com/poketype', 'postgres://me@localhost.example.com/poketype', 'postgres://me@10.0.0.5/poketype'])(
    'refuses a remote database: %s',
    (url) => {
      expect(isSeedingAllowed(url, undefined)).toBe(false);
      expect(isSeedingAllowed(url, 'yes')).toBe(false);
    },
  );

  it('allows a remote database only when SEED_ACCOUNTS is allow', () => {
    expect(isSeedingAllowed('postgres://me@db.example.com/poketype', 'allow')).toBe(true);
  });
});

describe('planSeed', () => {
  const remote = 'postgres://me@db.example.com/poketype';
  const local = 'postgres://me@localhost/poketype';

  it('seeds the demo accounts and ash locally when the ash password is set', () => {
    expect(planSeed(local, { seedAccounts: undefined, ashPassword: 'pass-from-env' })).toEqual({ demoAccounts: true, ashPassword: 'pass-from-env' });
  });

  it('seeds only ash into a remote database such as production', () => {
    expect(planSeed(remote, { seedAccounts: undefined, ashPassword: 'pass-from-env' })).toEqual({ demoAccounts: false, ashPassword: 'pass-from-env' });
  });

  it('skips ash without a password', () => {
    expect(planSeed(local, { seedAccounts: undefined, ashPassword: '' })).toEqual({ demoAccounts: true, ashPassword: null });
  });

  it('refuses a remote database with nothing allowed to seed', () => {
    expect(() => planSeed(remote, { seedAccounts: undefined, ashPassword: undefined })).toThrow(/Refusing/);
  });
});
