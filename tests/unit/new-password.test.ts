import { describe, expect, it } from 'vitest';
import { validateNewPassword } from '../../src/domain/new-password';

describe('validateNewPassword', () => {
  it.each(['12345678', 'a'.repeat(128), 'mot de passe', 'çàéèùôîï'])('accepts %s typed twice', (password) => {
    expect(validateNewPassword(password, password)).toEqual({ ok: true, password });
  });

  it('keeps spaces around the password instead of trimming them', () => {
    expect(validateNewPassword('  secret12  ', '  secret12  ')).toEqual({ ok: true, password: '  secret12  ' });
  });

  it('counts eight spaces as a valid password', () => {
    expect(validateNewPassword(' '.repeat(8), ' '.repeat(8))).toMatchObject({ ok: true });
  });

  it('stores decomposed accents in composed form and matches a composed confirmation', () => {
    const decomposed = 'été-2026';
    const composed = 'été-2026';
    expect(validateNewPassword(decomposed, composed)).toEqual({ ok: true, password: composed });
  });

  it('counts characters, not bytes or UTF-16 units', () => {
    expect(validateNewPassword('😀'.repeat(8), '😀'.repeat(8))).toMatchObject({ ok: true });
    expect(validateNewPassword('😀'.repeat(7), '😀'.repeat(7))).toEqual({ ok: false, errors: { password: 'tooShort' } });
  });

  it('counts a decomposed accent as one character', () => {
    const sevenComposed = 'é'.repeat(7);
    expect(validateNewPassword(sevenComposed, sevenComposed)).toEqual({ ok: false, errors: { password: 'tooShort' } });
  });

  it('asks for a password when it is empty, missing or a file', () => {
    expect(validateNewPassword('', 'x')).toEqual({ ok: false, errors: { password: 'required', confirmation: 'mismatch' } });
    expect(validateNewPassword(null, null)).toEqual({ ok: false, errors: { password: 'required', confirmation: 'required' } });
    expect(validateNewPassword(new File(['x'], 'x'), 'x')).toEqual({ ok: false, errors: { password: 'required', confirmation: 'mismatch' } });
  });

  it('rejects a password under 8 characters', () => {
    expect(validateNewPassword('1234567', '1234567')).toEqual({ ok: false, errors: { password: 'tooShort' } });
  });

  it('rejects a password over 128 characters', () => {
    const long = 'a'.repeat(129);
    expect(validateNewPassword(long, long)).toEqual({ ok: false, errors: { password: 'tooLong' } });
  });

  it('asks for the confirmation when it is empty', () => {
    expect(validateNewPassword('12345678', '')).toEqual({ ok: false, errors: { confirmation: 'required' } });
  });

  it('rejects a confirmation that differs, including by case or surrounding spaces', () => {
    expect(validateNewPassword('12345678', '12345679')).toEqual({ ok: false, errors: { confirmation: 'mismatch' } });
    expect(validateNewPassword('Secret12', 'secret12')).toEqual({ ok: false, errors: { confirmation: 'mismatch' } });
    expect(validateNewPassword('secret12', 'secret12 ')).toEqual({ ok: false, errors: { confirmation: 'mismatch' } });
  });

  it('reports both rules at once when both fail', () => {
    expect(validateNewPassword('short', 'other')).toEqual({ ok: false, errors: { password: 'tooShort', confirmation: 'mismatch' } });
  });
});
