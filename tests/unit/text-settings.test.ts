import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import { defaultTextSettings, isTextLength, parseTextSettings } from '../../src/domain/text-settings';

const valid = { language: 'en', length: 450, punctuation: false, accents: true, capitals: true, digits: false };

describe('text settings', () => {
  it('defaults to the configured length and options in the given language', () => {
    expect(defaultTextSettings('en')).toEqual({ language: 'en', length: gameConfig.text.defaultLength, ...gameConfig.text.defaultOptions });
  });

  it('accepts lengths from the minimum to the maximum in steps only', () => {
    expect(isTextLength(gameConfig.text.minLength)).toBe(true);
    expect(isTextLength(gameConfig.text.maxLength)).toBe(true);
    expect(isTextLength(gameConfig.text.minLength + gameConfig.text.lengthStep)).toBe(true);
    for (const length of [gameConfig.text.minLength - gameConfig.text.lengthStep, gameConfig.text.maxLength + gameConfig.text.lengthStep, 125, 200.5, '200']) expect(isTextLength(length)).toBe(false);
  });

  it('every length preset is a valid length', () => {
    for (const length of Object.values(gameConfig.text.lengthPresets)) expect(isTextLength(length)).toBe(true);
  });

  it('parses well-formed settings and keeps only the known fields', () => {
    expect(parseTextSettings({ ...valid, extra: 'x' })).toEqual(valid);
  });

  it.each([
    ['an unknown language', { ...valid, language: 'es' }],
    ['a length off the steps', { ...valid, length: 430 }],
    ['an option given as text', { ...valid, digits: 'true' }],
    ['a missing option', { language: 'fr', length: 200, punctuation: true, accents: true, capitals: true }],
    ['an array', [valid]],
  ])('refuses %s', (_label, value) => {
    expect(parseTextSettings(value)).toBeNull();
  });
});
