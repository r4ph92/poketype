import { describe, expect, it } from 'vitest';
import { resolveLocale } from '../../src/i18n/config';

describe('resolveLocale', () => {
  it.each(['fr', 'en'])('keeps the supported locale %s', (locale) => {
    expect(resolveLocale(locale)).toBe(locale);
  });

  it.each([undefined, null, '', 'de', 'EN', 'en-US', '<script>', 'fr;en', 'a'.repeat(4096), 42])(
    'falls back to French for %s',
    (value) => {
      expect(resolveLocale(value)).toBe('fr');
    },
  );
});
