import { describe, expect, it } from 'vitest';
import { isSeedingAllowed } from '../../scripts/seed-database';

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
