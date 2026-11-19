import { describe, expect, it } from 'vitest';
import { passageCorpus } from '../../src/assets/passage-corpus';
import { adaptPassage, firstWords, measureComplexity, passagesAtLevel, pickPassage, wordCount } from '../../src/domain/corpus';
import { defaultTextSettings, textLanguages, type TextSettings } from '../../src/domain/text-settings';

const coherent = (overrides: Partial<TextSettings> = {}): TextSettings => ({ ...defaultTextSettings('fr'), kind: 'coherent', ...overrides });

describe('the passage corpus (TECH-04)', () => {
  it('holds at least 20 passages per language, each with a unique slug, a title, an author and a source', () => {
    for (const language of textLanguages) expect(passageCorpus.filter((passage) => passage.language === language).length).toBeGreaterThanOrEqual(20);
    expect(new Set(passageCorpus.map((passage) => passage.slug)).size).toBe(passageCorpus.length);
    expect(passageCorpus.every(({ title, author, source }) => title && author && source.startsWith('Project Gutenberg #'))).toBe(true);
  });

  it('only holds characters a child can type: letters, accents of the language, spaces and plain punctuation, no digit', () => {
    const typeable = { fr: /^[A-Za-zÀÂÇÉÈÊËÎÏÔÙÛÜàâçéèêëîïôùûü .,;:!?'-]+$/u, en: /^[A-Za-z .,;:!?'-]+$/u };
    for (const passage of passageCorpus) {
      expect(passage.text, passage.slug).toMatch(typeable[passage.language]);
      expect(passage.text.normalize('NFC')).toBe(passage.text);
    }
  });
});

describe('adaptPassage (CONF-06 in coherent mode)', () => {
  const text = "Le Renard s'en saisit, et dit: Écoutez, mon bon monsieur!";

  it('keeps the passage as written when every switch is on', () => {
    expect(adaptPassage(text, coherent({ punctuation: true, capitals: true, accents: true }))).toBe(text);
  });

  it('without punctuation, drops the sentence marks but keeps apostrophes and hyphens', () => {
    expect(adaptPassage("Dit-elle: l'eau, vite!", coherent({ punctuation: false, capitals: true, accents: true }))).toBe("Dit-elle l'eau vite");
  });

  it('without capitals, lowercases; without accents, removes every accent and the cedilla', () => {
    expect(adaptPassage(text, coherent({ punctuation: true, capitals: false, accents: true }))).toBe("le renard s'en saisit, et dit: écoutez, mon bon monsieur!");
    expect(adaptPassage('Élève, garçon, où es-tu?', coherent({ punctuation: true, capitals: true, accents: false }))).toBe('Eleve, garcon, ou es-tu?');
  });
});

describe('wordCount and measureComplexity', () => {
  it('counts words with letters only', () => {
    expect(wordCount("Le corbeau, sur l'arbre perché - tenait un fromage.")).toBe(8);
  });

  it('rates long sentences of long words above short sentences of short words', () => {
    expect(measureComplexity('The cat sat. The dog ran. A bird sang.')).toBeLessThan(measureComplexity('Extraordinary circumstances necessitated considerable deliberation regarding transportation arrangements throughout the expedition.'));
  });
});

describe('pickPassage', () => {
  const candidates = [
    { slug: 'short', wordCount: 20 },
    { slug: 'medium', wordCount: 40 },
    { slug: 'long', wordCount: 80 },
    { slug: 'longer', wordCount: 100 },
  ];
  const first = () => 0;

  it('only picks a passage that has at least the host’s number of words', () => {
    expect(pickPassage(candidates, 50, null, first)?.slug).toBe('long');
    expect(pickPassage(candidates, 100, null, first)?.slug).toBe('longer');
    expect(pickPassage(candidates, 101, null, first)).toBeNull();
  });

  it('never picks the room’s previous passage when another exists', () => {
    expect(pickPassage(candidates, 10, 'short', first)?.slug).toBe('medium');
    expect(pickPassage([{ slug: 'only', wordCount: 30 }], 30, 'only', first)?.slug).toBe('only');
  });

  it('returns null for an empty corpus', () => {
    expect(pickPassage([], 30, null, first)).toBeNull();
  });
});

describe('firstWords (CONF-04)', () => {
  it('keeps exactly the first words, counting accented words like any other', () => {
    expect(firstWords('Il était une fois, très loin d’ici.', 4)).toBe('Il était une fois.');
    expect(wordCount(firstWords('Ça déjà élève ce garçon naïf, ému.', 5))).toBe(5);
  });

  it('does not count a lone mark as a word', () => {
    expect(firstWords('un — deux trois', 2)).toBe('un — deux');
  });

  it('keeps a text that has fewer words whole', () => {
    expect(firstWords('un deux', 5)).toBe('un deux');
  });

  it('cuts every corpus passage to the exact count when it has enough words', () => {
    for (const passage of passageCorpus) {
      for (const count of [10, 25, 40]) {
        const adapted = adaptPassage(passage.text, coherent({ language: passage.language }));
        expect(wordCount(firstWords(adapted, count)), passage.slug).toBe(count);
      }
    }
  });
});

describe('passagesAtLevel', () => {
  const list = ['the', 'cat', 'sat', 'on', 'mat', 'and', 'dog'];
  const candidates = [{ slug: 'plain', text: 'The cat sat on the mat.' }, { slug: 'rare', text: 'Extraordinary circumstances necessitated considerable deliberation.' }];

  it('keeps the passages that measure at the level', () => {
    expect(passagesAtLevel(candidates, 'easy', 'en', list).map((passage) => passage.slug)).toEqual(['plain']);
    expect(passagesAtLevel(candidates, 'hard', 'en', list).map((passage) => passage.slug)).toEqual(['rare']);
  });

  it('gives nothing when no passage is at the level, so a coherent race falls back to random words', () => {
    expect(passagesAtLevel(candidates, 'medium', 'en', list)).toEqual([]);
    expect(pickPassage(passagesAtLevel(candidates, 'medium', 'en', list).map((passage) => ({ ...passage, wordCount: 5 })), 5, null, () => 0)).toBeNull();
  });
});
