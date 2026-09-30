import { createHash, randomBytes } from 'node:crypto';

const wellFormedToken = /^[A-Za-z0-9_-]{43}$/;

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isWellFormedSessionToken(value: string | undefined): value is string {
  return value !== undefined && wellFormedToken.test(value);
}
