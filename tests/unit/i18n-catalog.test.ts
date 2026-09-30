import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';

describe('message catalogs', () => {
  it('French holds every namespace the home and 404 pages use', () => {
    expect(Object.keys(fr).sort()).toEqual(['Footer', 'Home', 'Metadata', 'NotFound']);
  });

  it('English footer has the same keys as the French footer', () => {
    expect(Object.keys(en.Footer).sort()).toEqual(Object.keys(fr.Footer).sort());
  });
});
