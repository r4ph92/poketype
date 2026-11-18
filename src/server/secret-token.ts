import { createHash, randomBytes } from 'node:crypto';

// 32 random bytes: 256 bits, printed as 43 base64url characters.
export function createSecretToken(): string {
  return randomBytes(32).toString('base64url');
}

// Only this hash is stored, so a database leak gives nobody a usable token.
export function hashSecretToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
