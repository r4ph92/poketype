import { createSecretToken, hashSecretToken } from '../secret-token';

const wellFormedToken = /^[A-Za-z0-9_-]{43}$/;

export const createSessionToken = createSecretToken;

export const hashSessionToken = hashSecretToken;

export function isWellFormedSessionToken(value: string | undefined): value is string {
  return value !== undefined && wellFormedToken.test(value);
}
