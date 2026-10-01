import { gameConfig } from '@/config/game';

export type UsernameError = 'required' | 'length' | 'characters';

export type UsernameResult = { ok: true; username: string } | { ok: false; error: UsernameError };

const allowedCharacters = /^[A-Za-z0-9_-]+$/;

const { minLength, maxLength } = gameConfig.account.username;

export const usernamePattern = new RegExp(`^[A-Za-z0-9_-]{${minLength},${maxLength}}$`);

export function validateUsername(submitted: FormDataEntryValue | null): UsernameResult {
  if (typeof submitted !== 'string') return { ok: false, error: 'required' };
  const username = submitted.trim();
  if (username === '') return { ok: false, error: 'required' };
  if (!allowedCharacters.test(username)) return { ok: false, error: 'characters' };
  if (username.length < minLength || username.length > maxLength) return { ok: false, error: 'length' };
  return { ok: true, username };
}

// Login and its throttle share this key, so "Maya", " maya " and "MAYA" are one account and one failure counter.
export function loginUsernameKey(submitted: string): string {
  return submitted.trim().toLowerCase();
}
