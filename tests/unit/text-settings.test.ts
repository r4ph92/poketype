import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import { defaultTextSettings, isWordCount, parseTextSettings } from '../../src/domain/text-settings';

const valid = { kind: 'random', errorMode: 'blocked', include: [], exclude: [], language: 'en', wordCount: 45, punctuation: false, accents: true, capitals: true, digits: false };

describe('text settings', () => {
  it('defaults to the configured length and options in the given language', () => {
    expect(defaultTextSettings('en')).toEqual({ kind: 'random', errorMode: 'blocked', include: [], exclude: [], language: 'en', wordCount: gameConfig.text.wordCount.default, ...gameConfig.text.defaultOptions });
  });

  it('defaults to 40 words, within 10 to 150 (CONF-04)', () => {
    expect(gameConfig.text.wordCount).toEqual({ min: 10, max: 150, default: 40 });
  });

  it('accepts every whole number of words from 10 to 150', () => {
    for (let wordCount = 10; wordCount <= 150; wordCount += 1) expect(isWordCount(wordCount)).toBe(true);
  });

  it.each([9, 151, 0, -40, 40.5, '40', null, Number.NaN, Number.POSITIVE_INFINITY])('refuses %s as a word count', (wordCount) => {
    expect(isWordCount(wordCount)).toBe(false);
  });

  it('every preset is a valid word count', () => {
    for (const wordCount of Object.values(gameConfig.text.wordCountPresets)) expect(isWordCount(wordCount)).toBe(true);
  });

  it('parses well-formed settings and keeps only the known fields', () => {
    expect(parseTextSettings({ ...valid, extra: 'x' })).toEqual(valid);
  });

  it.each([
    ['an unknown language', { ...valid, language: 'es' }],
    ['a word count above the maximum', { ...valid, wordCount: 151 }],
    ['a word count below the minimum', { ...valid, wordCount: 9 }],
    ['an option given as text', { ...valid, digits: 'true' }],
    ['a missing option', { kind: 'random', errorMode: 'blocked', include: [], exclude: [], language: 'fr', wordCount: 40, punctuation: true, accents: true, capitals: true }],
    ['an array', [valid]],
  ])('refuses %s', (_label, value) => {
    expect(parseTextSettings(value)).toBeNull();
  });
});
