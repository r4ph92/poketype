import { describe, expect, it } from 'vitest';
import { validateLogIn } from '../../src/features/account/log-in-validation';

function form(entries: Record<string, string | Blob>): FormData {
  const formData = new FormData();
  for (const [name, value] of Object.entries(entries)) formData.append(name, value);
  return formData;
}

describe('validateLogIn', () => {
  it('passes the username and the password through untouched', () => {
    expect(validateLogIn(form({ username: ' Maya ', password: ' secret ' }))).toEqual({ ok: true, username: ' Maya ', password: ' secret ' });
  });

  it('asks for both fields when they are empty, blank or files', () => {
    expect(validateLogIn(form({ username: '  ', password: '' }))).toEqual({ ok: false, errors: { username: 'required', password: 'required' } });
    expect(validateLogIn(form({ username: new Blob(['Maya']), password: 'secret' }))).toEqual({ ok: false, errors: { username: 'required' } });
    expect(validateLogIn(new FormData())).toEqual({ ok: false, errors: { username: 'required', password: 'required' } });
  });

  it('never applies the sign-up rules, so an impossible name gets the generic answer from the server', () => {
    expect(validateLogIn(form({ username: 'Maya!', password: 'x' }))).toEqual({ ok: true, username: 'Maya!', password: 'x' });
  });

  it('answers oversized entries with the generic credentials message', () => {
    expect(validateLogIn(form({ username: 'M'.repeat(101), password: 'secret' }))).toEqual({ ok: false, errors: { form: 'invalidCredentials' } });
    expect(validateLogIn(form({ username: 'Maya', password: 'p'.repeat(201) }))).toEqual({ ok: false, errors: { form: 'invalidCredentials' } });
  });
});
