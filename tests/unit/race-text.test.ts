import { describe, expect, it } from 'vitest';
import { raceWordLists } from '../../src/assets/word-lists';
import { gameConfig } from '../../src/config/game';
import { passageLength } from '../../src/domain/passage';
import { generateRaceText } from '../../src/domain/race-text';
import { defaultTextSettings, type TextSettings } from '../../src/domain/text-settings';
import { seededRandom } from './support/seeded-random';

const bare: TextSettings = { language: 'fr', length: 400, punctuation: false, accents: true, capitals: false, digits: false };

const seeds = Array.from({ length: 40 }, (_, index) => index + 1);

function textsFor(settings: TextSettings): string[] {
  return seeds.map((seed) => generateRaceText(settings, raceWordLists, seededRandom(seed)));
}

function wordsOf(text: string): string[] {
  return text.split(' ').map((token) => token.replace(/[.,?]$/u, ''));
}

// The longest token is an elided ten-letter word with a comma (qu'aaaaaaaaaa,), plus its space and the period's reserved character.
const lengthSlack = 16;

describe('generateRaceText', () => {
  it('fits every length setting between the target minus one word and the target', () => {
    for (let length = gameConfig.text.minLength; length <= gameConfig.text.maxLength; length += gameConfig.text.lengthStep) {
      for (const text of textsFor({ ...defaultTextSettings('fr'), length, digits: true })) {
        expect(passageLength(text), text).toBeLessThanOrEqual(length);
        expect(passageLength(text), text).toBeGreaterThanOrEqual(length - lengthSlack);
      }
    }
  });

  it('uses only words of the chosen language list when every option is off', () => {
    for (const language of ['fr', 'en'] as const) {
      const list = new Set(raceWordLists[language]);
      for (const text of textsFor({ ...bare, language })) for (const word of text.split(' ')) expect(list.has(word), word).toBe(true);
    }
  });

  it('never leaves a leading, trailing or double space', () => {
    for (const text of textsFor(defaultTextSettings('fr'))) {
      expect(text).toBe(text.trim());
      expect(text).not.toContain('  ');
    }
  });

  it('writes no punctuation when punctuation is off', () => {
    for (const text of textsFor({ ...bare, capitals: true, digits: true })) expect(text).not.toMatch(/[.,?']/u);
  });

  it('ends sentences with a period or a question mark and adds commas and apostrophes when punctuation is on', () => {
    const texts = textsFor({ ...bare, punctuation: true });
    for (const text of texts) expect(text).toMatch(/[.?]$/u);
    const allText = texts.join(' ');
    for (const mark of ['.', ',', '?', "'"]) expect(allText).toContain(mark);
  });

  it('joins French elisions only before a vowel or h, and English possessives with an s', () => {
    for (const text of textsFor({ ...bare, punctuation: true })) for (const word of wordsOf(text).filter((token) => token.includes("'"))) expect(word).toMatch(/^(l|d|j|n|s|qu|c|m|t)'[aeiouhàâéèêîôû]/u);
    for (const text of textsFor({ ...bare, language: 'en', punctuation: true })) for (const word of wordsOf(text).filter((token) => token.includes("'"))) expect(word).toMatch(/^[a-z]+'s$/u);
  });

  it('includes accented letters and ç with accents on, and none with accents off', () => {
    const accented = textsFor(bare).join(' ');
    for (const letter of ['é', 'è', 'à', 'ç', 'ê']) expect(accented).toContain(letter);
    for (const text of textsFor({ ...bare, accents: false })) expect(text).toMatch(/^[a-z ]+$/u);
  });

  it('starts every sentence with a capital that is never accented when capitals and punctuation are on', () => {
    for (const text of textsFor({ ...bare, punctuation: true, capitals: true })) {
      for (const sentence of text.split(/(?<=[.?]) /u)) expect(sentence, sentence).toMatch(/^[A-Z]/u);
      expect(text).not.toMatch(/[ÀÂÇÉÈÊÎÔÙÛ]/u);
    }
  });

  it('capitalizes some words without punctuation, and none with capitals off', () => {
    expect(textsFor({ ...bare, capitals: true }).join(' ')).toMatch(/[A-Z]/u);
    for (const text of textsFor({ ...bare, punctuation: true, digits: true })) expect(text).not.toMatch(/[A-Z]/u);
  });

  it('mixes in numbers only when digits are on', () => {
    expect(textsFor({ ...bare, digits: true }).join(' ')).toMatch(/\b\d{1,3}\b/u);
    for (const text of textsFor(bare)) expect(text).not.toMatch(/\d/u);
  });

  it('returns NFC text', () => {
    for (const text of textsFor(defaultTextSettings('fr'))) expect(text).toBe(text.normalize('NFC'));
  });

  it('gives the same text for the same draws, so one generation serves every player', () => {
    const settings = defaultTextSettings('en');
    expect(generateRaceText(settings, raceWordLists, seededRandom(7))).toBe(generateRaceText(settings, raceWordLists, seededRandom(7)));
  });
});
