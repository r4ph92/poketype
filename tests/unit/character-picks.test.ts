import { describe, expect, it } from 'vitest';
import { raceWordLists } from '../../src/assets/word-lists';
import { pickableCharacters } from '../../src/domain/character-picks';
import { generateRaceText, textPickProblem } from '../../src/domain/race-text';
import type { TextSettings } from '../../src/domain/text-settings';
import { textSettingsRequestSchema } from '../../src/server/validation/room-schemas';
import { seededRandom } from './support/seeded-random';

const french: TextSettings = { kind: 'random', errorMode: 'blocked', include: [], exclude: [], language: 'fr', length: 200, punctuation: true, accents: true, capitals: true, digits: false };
const english: TextSettings = { ...french, language: 'en' };
const seeds = Array.from({ length: 100 }, (_, index) => index + 1);
const optionMixes: Partial<TextSettings>[] = [{}, { punctuation: false }, { capitals: false }, { punctuation: false, capitals: false, digits: true }];
const lengths = [100, 200, 400, 800];

const occurrences = (text: string, character: string) => text.toLowerCase().split(character).length - 1;

function textsFor(settings: TextSettings): string[] {
  return seeds.map((seed) => generateRaceText(settings, raceWordLists, seededRandom(seed))!);
}

describe('CONF-07: required characters', () => {
  it('holds é, ç and à at least 3 times each in every French text, at every length and option mix', () => {
    for (const length of lengths) {
      for (const options of optionMixes) {
        for (const text of textsFor({ ...french, ...options, length, include: ['é', 'ç', 'à'] })) {
          for (const character of ['é', 'ç', 'à']) expect(occurrences(text, character), `${character} in ${text}`).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it.each([
    { name: 'short French text with the rarer accents', settings: { ...french, length: 100, include: ['à', 'â', 'ç', 'ù', 'û'] } },
    { name: 'short English text with j q x z', settings: { ...english, length: 100, include: ['j', 'q', 'x', 'z'] } },
  ])('never produces a text that breaks the include promise: $name', ({ settings }) => {
    for (const seed of seeds) {
      const text = generateRaceText(settings, raceWordLists, seededRandom(seed));
      if (text === null) continue;
      for (const character of settings.include) expect(occurrences(text, character), `${character} in ${text}`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('CONF-07: excluded characters', () => {
  it('never shows q or z in a French text, elisions and capitals included, at every length and option mix', () => {
    for (const length of lengths) {
      for (const options of optionMixes) {
        for (const text of textsFor({ ...french, ...options, length, exclude: ['q', 'z'] })) expect(text, text).not.toMatch(/[qzQZ]/u);
      }
    }
  });

  it("never shows l, d or an elision holding them (l', d') in a French text", () => {
    for (const text of textsFor({ ...french, length: 800, exclude: ['l', 'd'] })) expect(text, text).not.toMatch(/[lLdD]/u);
  });

  it("never shows s, possessive 's included, in an English text", () => {
    for (const text of textsFor({ ...english, length: 800, exclude: ['s'] })) expect(text, text).not.toMatch(/[sS]/u);
  });
});

describe('CONF-07: impossible selections', () => {
  it('reports every vowel excluded as too few words, and a character no word holds by name', () => {
    const vowels = ['a', 'e', 'i', 'o', 'u', 'y', 'à', 'â', 'é', 'è', 'ê', 'ë', 'î', 'ï', 'ô', 'ù', 'û', 'ü', 'œ'];
    expect(textPickProblem({ ...french, exclude: vowels }, raceWordLists)).toEqual({ kind: 'too-few-words' });
    expect(textPickProblem({ ...french, include: ['k', 'œ'] }, raceWordLists)).toEqual({ kind: 'never-found', characters: ['k', 'œ'] });
    expect(textPickProblem({ ...french, length: 100, include: [...pickableCharacters.fr] }, raceWordLists)?.kind).toBe('never-found');
    expect(textPickProblem({ ...french, accents: false, include: ['é'] }, raceWordLists)).toEqual({ kind: 'never-found', characters: ['é'] });
  });
});

describe('CONF-07: the offered characters and the server schema', () => {
  it('offers the 26 lowercase letters plus à â ç é è ê ë î ï ô ù û ü œ in French, and the letters only in English', () => {
    expect(pickableCharacters.fr).toEqual([...'abcdefghijklmnopqrstuvwxyz', ...'àâçéèêëîïôùûüœ']);
    expect(pickableCharacters.en).toEqual([...'abcdefghijklmnopqrstuvwxyz']);
  });

  it('refuses an emoji, <, an uppercase or decomposed é, a duplicate, a character in both lists and an accent in English', () => {
    const refused: unknown[] = [
      { ...french, include: ['😀'] },
      { ...french, exclude: ['<'] },
      { ...french, include: ['<script>'] },
      { ...french, include: ['É'] },
      { ...french, include: ['é'] },
      { ...french, include: ['é', 'é'] },
      { ...french, include: ['a'], exclude: ['a'] },
      { ...french, include: [''] },
      { ...french, include: [1] },
      { ...french, include: 'é' },
      { ...english, include: ['é'] },
      { ...english, exclude: ['œ'] },
    ];
    for (const body of refused) expect(textSettingsRequestSchema.safeParse(body).success, JSON.stringify(body)).toBe(false);
  });
});
