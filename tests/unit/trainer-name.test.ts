import { describe, expect, it } from 'vitest';
import { validateTrainerName } from '../../src/domain/trainer-name';

describe('validateTrainerName', () => {
  it.each(['Alex', 'Zoé', 'Jean-Luc', 'Élise 2', 'Al', 'a'.repeat(16), 'Éric', '42'])('accepts %s', (input) => {
    expect(validateTrainerName(input)).toEqual({ ok: true, name: input });
  });

  it('trims spaces around the name', () => {
    expect(validateTrainerName('  Alex  ')).toEqual({ ok: true, name: 'Alex' });
  });

  it('stores decomposed accents in composed form', () => {
    expect(validateTrainerName('Élise')).toEqual({ ok: true, name: 'Élise' });
  });

  it.each(['', '    '])('asks for a name when it is empty or only spaces: "%s"', (input) => {
    expect(validateTrainerName(input)).toEqual({ ok: false, error: 'required' });
  });

  it('asks for a name when the entry is missing or is a file', () => {
    expect(validateTrainerName(null)).toEqual({ ok: false, error: 'required' });
    expect(validateTrainerName(new File(['x'], 'x.txt'))).toEqual({ ok: false, error: 'required' });
  });

  it.each(['A', 'a'.repeat(17)])('rejects a length outside 2 to 16: %s', (input) => {
    expect(validateTrainerName(input)).toEqual({ ok: false, error: 'length' });
  });

  it('counts an emoji-free accented name in characters, not bytes', () => {
    expect(validateTrainerName('é'.repeat(16))).toMatchObject({ ok: true });
  });

  it.each(['<b>Alex</b>', 'Alex!', '-Alex', 'Alex_1', 'A😀lex', 'Alex\nBob'])('rejects forbidden characters: %s', (input) => {
    expect(validateTrainerName(input)).toEqual({ ok: false, error: 'characters' });
  });

  it.each([
    ['Hangul filler U+3164', '\u3164\u3164'],
    ['Hangul choseong filler U+115F', '\u115F\u115F'],
    ['Hangul jungseong filler U+1160', 'A\u1160'],
    ['halfwidth Hangul filler U+FFA0', '\uFFA0\uFFA0'],
    ['combining grapheme joiner', 'A\u034F'],
    ['variation selector', 'Z\uFE0F'],
    ['zero width joiner', 'Al\u200Dex'],
    ['soft hyphen', 'Al\u00ADex'],
  ])('rejects invisible code points: %s', (_label, input) => {
    expect(validateTrainerName(input)).toEqual({ ok: false, error: 'characters' });
  });

  it('needs at least two letters or digits, not two code points', () => {
    expect(validateTrainerName('A-')).toEqual({ ok: false, error: 'length' });
    expect(validateTrainerName('- ')).toEqual({ ok: false, error: 'characters' });
  });
});
