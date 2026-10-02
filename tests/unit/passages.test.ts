import { describe, expect, it } from 'vitest';
import { frenchPassages } from '../../src/config/passages';
import { pickNextPassage, pickPassage } from '../../src/domain/passage';

// Unaccented letters, lowercase é è à ù ç ê, straight apostrophe, plain space, comma and period.
const childFriendlyFrench = /^[A-Za-zéèàùçê' ,.]+$/;

describe('French passages', () => {
  it('every passage is NFC', () => {
    for (const passage of frenchPassages) expect(passage).toBe(passage.normalize('NFC'));
  });

  it('uses only lowercase accents a child finds on a French keyboard, and no accented capital or œ', () => {
    for (const passage of frenchPassages) expect(passage, passage).toMatch(childFriendlyFrench);
  });

  it('never holds a lone accent or combining mark, which typing ignores', () => {
    for (const passage of frenchPassages) expect(passage, passage).not.toMatch(/[\p{Sk}\p{Mn}]/u);
  });

  it('the list includes ç and every accented letter it allows', () => {
    const allText = frenchPassages.join(' ');
    for (const letter of ['ç', 'é', 'è', 'à', 'ê', 'ù']) expect(allText).toContain(letter);
  });

  it('no leading, trailing or double spaces', () => {
    for (const passage of frenchPassages) {
      expect(passage).toBe(passage.trim());
      expect(passage).not.toContain('  ');
    }
  });

  it('pickPassage returns a list item at both index bounds', () => {
    expect(pickPassage(frenchPassages, () => 0)).toBe(frenchPassages[0]);
    expect(pickPassage(frenchPassages, (count) => count - 1)).toBe(frenchPassages.at(-1));
  });

  it('pickPassage refuses an index outside the list', () => {
    expect(() => pickPassage(frenchPassages, (count) => count)).toThrow(RangeError);
  });

  it('pickPassage returns NFC text even from a decomposed list', () => {
    const decomposed = ['récréation'.normalize('NFD')];
    expect(pickPassage(decomposed, () => 0)).toBe('récréation'.normalize('NFC'));
  });
  it('pickNextPassage never repeats the previous race passage', () => {
    for (let index = 0; index < frenchPassages.length - 1; index += 1) {
      expect(pickNextPassage(frenchPassages, frenchPassages[0]!, () => index)).not.toBe(frenchPassages[0]);
    }
  });

  it('pickNextPassage draws from the whole list for a first race', () => {
    expect(pickNextPassage(frenchPassages, null, () => 0)).toBe(frenchPassages[0]);
  });

  it('pickNextPassage repeats a passage only when the list holds nothing else', () => {
    expect(pickNextPassage(['seul texte'], 'seul texte', () => 0)).toBe('seul texte');
  });
});
