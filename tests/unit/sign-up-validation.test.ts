import { describe, expect, it } from 'vitest';
import { validateSignUp } from '../../src/features/account/sign-up-validation';

function submission(fields: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(fields).forEach(([name, value]) => formData.set(name, value));
  return formData;
}

describe('validateSignUp', () => {
  it('returns the trimmed username and the untrimmed password when every rule passes', () => {
    expect(validateSignUp(submission({ username: ' Maya ', password: ' secret12', confirmation: ' secret12' }))).toEqual({
      ok: true,
      username: 'Maya',
      password: ' secret12',
    });
  });

  it('reports every failed rule at once', () => {
    expect(validateSignUp(submission({ username: 'ab', password: 'short', confirmation: 'other' }))).toEqual({
      ok: false,
      errors: { username: 'length', password: 'tooShort', confirmation: 'mismatch' },
    });
  });

  it('reports only the username when the passwords are valid', () => {
    expect(validateSignUp(submission({ username: 'Zoé', password: 'secret12', confirmation: 'secret12' }))).toEqual({
      ok: false,
      errors: { username: 'characters' },
    });
  });

  it('treats missing fields as empty', () => {
    expect(validateSignUp(new FormData())).toEqual({
      ok: false,
      errors: { username: 'required', password: 'required', confirmation: 'required' },
    });
  });
});
