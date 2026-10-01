import { describe, expect, it } from 'vitest';
import { dummyPasswordHash } from '../../src/server/accounts/dummy-password-hash';
import { parsePasswordHash } from '../../src/server/accounts/password-hash-format';
import { currentCost, verifyPassword } from '../../src/server/accounts/password-hash';

describe('dummy password hash', () => {
  it('is a well-formed hash at the current cost, so checking it takes as long as a real one', () => {
    expect(parsePasswordHash(dummyPasswordHash)?.cost).toEqual(currentCost);
  });

  it('matches no ordinary password', async () => {
    await expect(verifyPassword('', dummyPasswordHash)).resolves.toBe(false);
    await expect(verifyPassword('Bulbizarre-Maya-26', dummyPasswordHash)).resolves.toBe(false);
  });
});
