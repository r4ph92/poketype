import { describe, expect, it } from 'vitest';
import { passageCorpus } from '../../src/assets/passage-corpus';
import { adaptPassage, measureComplexity, pickPassage, wordCount } from '../../src/domain/corpus';
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
    { slug: 'short', length: 200 },
    { slug: 'medium', length: 400 },
    { slug: 'long', length: 600 },
    { slug: 'longer', length: 650 },
  ];
  const first = () => 0;

  it('picks among the passages closest to the host’s length', () => {
    expect(pickPassage(candidates, 210, null, first)?.slug).toBe('short');
    expect(pickPassage(candidates, 640, null, first)?.slug).toBe('longer');
  });

  it('never picks the room’s previous passage when another exists', () => {
    expect(pickPassage(candidates, 210, 'short', first)?.slug).toBe('medium');
    expect(pickPassage([{ slug: 'only', length: 300 }], 300, 'only', first)?.slug).toBe('only');
  });

  it('returns null for an empty corpus', () => {
    expect(pickPassage([], 300, null, first)).toBeNull();
  });
});
