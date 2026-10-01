import { describe, expect, it } from 'vitest';
import { frenchPassages } from '../../src/config/passages';
import { pickPassage } from '../../src/domain/passage';

// Letters, the five single-key accented letters of a French AZERTY keyboard, straight apostrophe, plain space, comma and period.
const singleKeyAzerty = /^[A-Za-zéèàùç' ,.]+$/;

describe('French passages', () => {
  it('every passage is NFC', () => {
    for (const passage of frenchPassages) expect(passage).toBe(passage.normalize('NFC'));
  });

  it('uses only characters a child can type on a French keyboard without dead keys', () => {
    for (const passage of frenchPassages) expect(passage, passage).toMatch(singleKeyAzerty);
  });

  it('the list includes ç and accented letters', () => {
    const allText = frenchPassages.join(' ');
    for (const letter of ['ç', 'é', 'è', 'à']) expect(allText).toContain(letter);
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
});
