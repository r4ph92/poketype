import { describe, expect, it } from 'vitest';
import { raceWordLists } from '../../src/assets/word-lists';
import { gameConfig } from '../../src/config/game';
import { coherentLimits } from '../../src/server/rooms/coherent-limits';
import { generateRaceText, textPickProblem } from '../../src/domain/race-text';
import { areCharacterPicks, pickableCharacters } from '../../src/domain/character-picks';
import { defaultTextSettings, type TextSettings } from '../../src/domain/text-settings';
import { seededRandom } from './support/seeded-random';

const bare: TextSettings = { kind: 'random', errorMode: 'blocked', include: [], exclude: [], language: 'fr', wordCount: 80, punctuation: false, accents: true, capitals: false, digits: false };

const seeds = Array.from({ length: 40 }, (_, index) => index + 1);

function textsFor(settings: TextSettings): string[] {
  return seeds.map((seed) => generateRaceText(settings, raceWordLists, seededRandom(seed))!);
}

function wordsOf(text: string): string[] {
  return text.split(' ').map((token) => token.replace(/[.,?]$/u, ''));
}

describe('generateRaceText', () => {
  it('holds exactly the chosen number of words, from the minimum to the maximum (CONF-04)', () => {
    const { min, max } = gameConfig.text.wordCount;
    for (const wordCount of [min, 25, gameConfig.text.wordCount.default, 99, max]) {
      for (const language of ['fr', 'en'] as const) {
        for (const text of textsFor({ ...defaultTextSettings(language), wordCount, digits: true })) expect(text.split(' ').length, text).toBe(wordCount);
      }
    }
  });

  it('counts an accented word, ç and an elision as one word each', () => {
    for (const text of textsFor({ ...defaultTextSettings('fr'), wordCount: 25, include: ['é', 'ç'] })) expect(text.split(' ').length, text).toBe(25);
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

describe('character picks in random text (CONF-07)', () => {
  const seeded = (seed: number) => {
    let state = seed;
    return (count: number) => {
      state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
      return state % count;
    };
  };
  const french: TextSettings = { ...defaultTextSettings('fr'), wordCount: 60 };

  it('includes each picked character at least three times', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const text = generateRaceText({ ...french, include: ['é', 'ç', 'à'] }, raceWordLists, seeded(seed))!.toLowerCase();
      for (const character of ['é', 'ç', 'à']) expect(text.split(character).length - 1, `seed ${seed}: ${character}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('never holds an excluded character, not even in a capital, an elision or a possessive', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      expect(generateRaceText({ ...french, exclude: ['q', 'z', 'l'] }, raceWordLists, seeded(seed))!.toLowerCase()).not.toMatch(/[qzl]/u);
      expect(generateRaceText({ ...defaultTextSettings('en'), exclude: ['s'] }, raceWordLists, seeded(seed))!.toLowerCase()).not.toMatch(/s/u);
    }
  });

  it('tells when the picks cannot give a text: every vowel excluded, or a required character no word holds', () => {
    expect(textPickProblem({ ...french, exclude: ['a', 'e', 'i', 'o', 'u', 'y'] }, raceWordLists, coherentLimits)).toEqual({ kind: 'too-few-words' });
    expect(textPickProblem({ ...french, include: ['œ', 'é'] }, raceWordLists, coherentLimits)).toEqual({ kind: 'never-found', characters: ['œ'] });
    expect(textPickProblem({ ...french, include: ['é'], exclude: ['q'] }, raceWordLists, coherentLimits)).toBeNull();
  });
});

describe('the include quota is never broken (CONF-07)', () => {
  const frenchShort: TextSettings = { ...defaultTextSettings('fr'), wordCount: 20 };

  it('returns null when every draw misses the quota', () => {
    const neverFavoured = (count: number) => count - 1;
    expect(generateRaceText({ ...frenchShort, include: ['z'] }, raceWordLists, neverFavoured)).toBeNull();
  });

  it('gives no text rather than one that misses the quota when the draws keep failing', () => {
    const rare = { ...frenchShort, include: ['à', 'â', 'ç', 'ù', 'û'] };
    expect(textPickProblem(rare, raceWordLists, coherentLimits)).toBeNull();
    const texts = seedsUpTo(100).map((seed) => generateRaceText(rare, raceWordLists, seededRandom(seed)));
    for (const text of texts) expect(text === null || rare.include.every((character) => text.split(character).length - 1 >= 3)).toBe(true);
  });
});

function seedsUpTo(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index + 1);
}

describe('areCharacterPicks', () => {
  it('accepts offered characters only, each once, never in both lists, and no accent in English', () => {
    expect(areCharacterPicks('fr', ['é', 'ç'], ['q'])).toBe(true);
    expect(areCharacterPicks('fr', ['🙂'], [])).toBe(false);
    expect(areCharacterPicks('fr', ['<'], [])).toBe(false);
    expect(areCharacterPicks('fr', ['é', 'é'], [])).toBe(false);
    expect(areCharacterPicks('fr', ['q'], ['q'])).toBe(false);
    expect(areCharacterPicks('en', ['é'], [])).toBe(false);
    expect(areCharacterPicks('fr', 'é', [])).toBe(false);
  });

  it('offers the lowercase letters plus à â ç é è ê ë î ï ô ù û ü œ in French, and only the letters in English', () => {
    expect(pickableCharacters.fr.join('')).toBe('abcdefghijklmnopqrstuvwxyzàâçéèêëîïôùûüœ');
    expect(pickableCharacters.en.join('')).toBe('abcdefghijklmnopqrstuvwxyz');
  });
});
