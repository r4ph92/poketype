import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';

const rightsHolders = ['Nintendo', 'Game Freak', 'The Pokémon Company'];

function joined(footer: Record<string, string>): string {
  return Object.values(footer).join(' ');
}

describe('footer notice', () => {
  it('names the rights holders in French and English', () => {
    for (const holder of rightsHolders) {
      expect(joined(fr.Footer)).toContain(holder);
      expect(joined(en.Footer)).toContain(holder);
    }
  });

  it('states the project is non-commercial and educational in French', () => {
    const text = joined(fr.Footer);
    expect(text).toContain('non commercial');
    expect(text).toContain('éducatif');
    expect(text).toContain("n'est pas affilié");
  });

  it('states the project is non-commercial and educational in English', () => {
    const text = joined(en.Footer);
    expect(text).toContain('non-commercial');
    expect(text).toContain('educational');
    expect(text).toContain('not affiliated');
  });
});
