import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/server/accounts/password-hash';

const phcScrypt = /^\$scrypt\$ln=16,r=8,p=2\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$/;

describe('password hashing', () => {
  it('stores a salted scrypt hash in PHC format that never contains the password', async () => {
    const stored = await hashPassword('pikachu-2026');
    expect(stored).toMatch(phcScrypt);
    expect(stored).not.toContain('pikachu');
  });

  it('gives the same password a different hash each time', async () => {
    expect(await hashPassword('pikachu-2026')).not.toBe(await hashPassword('pikachu-2026'));
  });

  it('accepts the right password and rejects a different one', async () => {
    const stored = await hashPassword('pikachu-2026');
    await expect(verifyPassword('pikachu-2026', stored)).resolves.toBe(true);
    await expect(verifyPassword('Pikachu-2026', stored)).resolves.toBe(false);
    await expect(verifyPassword('pikachu-2026 ', stored)).resolves.toBe(false);
  });

  it('verifies a decomposed accent against a password hashed in composed form', async () => {
    const stored = await hashPassword('été-2026');
    await expect(verifyPassword('été-2026', stored)).resolves.toBe(true);
  });

  it('rejects a tampered hash without throwing', async () => {
    const stored = await hashPassword('pikachu-2026');
    const middle = stored.length - 20;
    const tampered = `${stored.slice(0, middle)}${stored[middle] === 'A' ? 'B' : 'A'}${stored.slice(middle + 1)}`;
    await expect(verifyPassword('pikachu-2026', tampered)).resolves.toBe(false);
  });

  const salt = 'A'.repeat(22);
  const key = 'A'.repeat(43);
  it.each([
    ['empty', ''],
    ['plain text', 'pikachu-2026'],
    ['another algorithm', `$argon2id$v=19$m=65536,t=3,p=4$${salt}$${key}`],
    ['a short salt', `$scrypt$ln=16,r=8,p=2$${salt.slice(1)}$${key}`],
    ['a short key', `$scrypt$ln=16,r=8,p=2$${salt}$${key.slice(1)}`],
    ['a cost above the bound', `$scrypt$ln=21,r=8,p=2$${salt}$${key}`],
    ['a zero cost', `$scrypt$ln=0,r=8,p=2$${salt}$${key}`],
    ['a block size above the bound', `$scrypt$ln=16,r=17,p=2$${salt}$${key}`],
    ['a cost over the memory limit', `$scrypt$ln=20,r=16,p=1$${salt}$${key}`],
  ])('rejects a malformed or out-of-range hash without throwing: %s', async (_label, stored) => {
    await expect(verifyPassword('pikachu-2026', stored)).resolves.toBe(false);
  });
});
