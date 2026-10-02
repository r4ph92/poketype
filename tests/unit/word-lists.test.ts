import { describe, expect, it } from 'vitest';
import { wordBlocklist } from '../../scripts/data/word-blocklist';
import { raceWordLists } from '../../src/assets/word-lists';
import { raceWordPatterns, textLanguages } from '../../src/domain/text-settings';

describe('race word lists', () => {
  for (const language of textLanguages) {
    const words = raceWordLists[language];

    it(`${language}: holds a thousand distinct words`, () => {
      expect(words).toHaveLength(1000);
      expect(new Set(words).size).toBe(words.length);
    });

    it(`${language}: keeps lowercase words of 2 to 10 letters a child can type, in NFC`, () => {
      for (const word of words) {
        expect(word, word).toMatch(raceWordPatterns[language]);
        expect(word).toBe(word.normalize('NFC'));
      }
    });

    it(`${language}: contains nothing from the blocklist`, () => {
      const blocked = new Set<string>(wordBlocklist[language]);
      expect(words.filter((word) => blocked.has(word))).toEqual([]);
    });
  }

  it('the French list has enough plain words for a text without accents', () => {
    expect(raceWordLists.fr.filter((word) => /^[a-z]+$/u.test(word)).length).toBeGreaterThan(500);
  });
});
