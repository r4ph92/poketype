import { describe, expect, it } from 'vitest';
import { findGuestBySessionToken, type Database } from '../../src/server/sessions/session-store';
import { createSessionToken, hashSessionToken, isWellFormedSessionToken } from '../../src/server/sessions/session-token';

describe('session token', () => {
  it('creates well-formed tokens that differ each time', () => {
    const first = createSessionToken();
    expect(isWellFormedSessionToken(first)).toBe(true);
    expect(createSessionToken()).not.toBe(first);
  });

  it('hashes deterministically and differently per token', () => {
    const token = createSessionToken();
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    expect(hashSessionToken(token)).not.toBe(hashSessionToken(createSessionToken()));
    expect(hashSessionToken(token)).not.toContain(token);
  });

  it.each([undefined, '', 'short', 'a'.repeat(42), 'a'.repeat(44), `${'a'.repeat(42)}=`, `${'a'.repeat(42)}!`])(
    'rejects malformed value %s',
    (value) => {
      expect(isWellFormedSessionToken(value)).toBe(false);
    },
  );
});

describe('findGuestBySessionToken with a malformed token', () => {
  const forbiddenDatabase = new Proxy({}, {
    get() {
      throw new Error('the database must not be queried');
    },
  }) as Database;

  it.each([undefined, 'invented', 'a'.repeat(44)])('answers null without querying: %s', async (token) => {
    await expect(findGuestBySessionToken(forbiddenDatabase, token)).resolves.toBeNull();
  });
});
