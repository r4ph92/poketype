import { describe, expect, it } from 'vitest';
import { loginUsernameKey, usernamePattern, validateUsername } from '../../src/domain/username';

describe('validateUsername', () => {
  it.each(['Maya', 'leo', 'Maya_2', 'jean-luc', 'abc', 'a'.repeat(20), '123', '___', '-a-'])('accepts %s', (input) => {
    expect(validateUsername(input)).toEqual({ ok: true, username: input });
  });

  it('trims spaces around the username', () => {
    expect(validateUsername('  Maya  ')).toEqual({ ok: true, username: 'Maya' });
  });

  it.each(['', '   '])('asks for a username when it is empty or only spaces: "%s"', (input) => {
    expect(validateUsername(input)).toEqual({ ok: false, error: 'required' });
  });

  it('asks for a username when the entry is missing or is a file', () => {
    expect(validateUsername(null)).toEqual({ ok: false, error: 'required' });
    expect(validateUsername(new File(['x'], 'x.txt'))).toEqual({ ok: false, error: 'required' });
  });

  it.each(['ab', 'a'.repeat(21)])('rejects a length outside 3 to 20: %s', (input) => {
    expect(validateUsername(input)).toEqual({ ok: false, error: 'length' });
  });

  it.each(['Zoé', 'a b', '<b>x</b>', 'Maya!', 'Ma.ya', 'Ma\nya', 'Ma\u200Bya', 'Мaya', 'ab😀'])('rejects forbidden characters: %s', (input) => {
    expect(validateUsername(input)).toEqual({ ok: false, error: 'characters' });
  });

  it('reports forbidden characters before the length', () => {
    expect(validateUsername('é')).toEqual({ ok: false, error: 'characters' });
  });
});

describe('usernamePattern', () => {
  it('is the rule built from the configured lengths', () => {
    expect(usernamePattern.source).toBe('^[A-Za-z0-9_-]{3,20}$');
  });

  it.each(['Maya', 'ab', 'a'.repeat(20), 'a'.repeat(21), 'Zoé', 'a b', 'x_y-z', '<b>'])(
    'accepts exactly what validateUsername accepts: %s',
    (input) => {
      expect(usernamePattern.test(input)).toBe(validateUsername(input).ok);
    },
  );
});

describe('loginUsernameKey', () => {
  it('ignores surrounding spaces and letter case', () => {
    expect(loginUsernameKey('  MaYa ')).toBe('maya');
  });

  it('keeps inner characters as typed', () => {
    expect(loginUsernameKey('Maya!')).toBe('maya!');
  });
});
