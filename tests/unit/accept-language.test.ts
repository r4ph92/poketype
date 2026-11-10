import { describe, expect, it } from 'vitest';
import { localeFromAcceptLanguage } from '../../src/i18n/accept-language';

describe('localeFromAcceptLanguage', () => {
  it.each([
    ['en-CA,en;q=0.9', 'en'],
    ['fr-CA', 'fr'],
    ['EN-us', 'en'],
    ['de-DE,en;q=0.5', 'en'],
    ['de-DE,fr;q=0.3,en;q=0.2', 'fr'],
    ['en;q=0.4,fr;q=0.8', 'fr'],
    ['fr;q=0.5,en;q=0.5', 'fr'],
    ['en;q=0,fr;q=0.1', 'fr'],
  ])('reads %s as %s', (header, locale) => {
    expect(localeFromAcceptLanguage(header)).toBe(locale);
  });

  it.each([
    ['no header', null],
    ['an empty header', ''],
    ['an unsupported language', 'de-DE'],
    ['a wildcard', '*'],
    ['markup', '<script>alert(1)</script>'],
    ['a broken weight', 'en;q=abc'],
    ['a weight above one', 'en;q=2'],
    ['a refused English', 'en;q=0'],
    ['a header over the length cap', `${'de,'.repeat(300)}en`],
    ['English after the entry cap', `${'de,'.repeat(16)}en`],
  ])('falls back to French for %s', (_case, header) => {
    expect(localeFromAcceptLanguage(header)).toBe('fr');
  });
});
