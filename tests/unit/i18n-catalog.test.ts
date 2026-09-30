import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import enFallback from '../../messages/fallback/en.json';
import frFallback from '../../messages/fallback/fr.json';
import fr from '../../messages/fr.json';

type Catalog = { [key: string]: string | Catalog };

function keyPaths(catalog: Catalog, prefix = ''): string[] {
  return Object.entries(catalog).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : keyPaths(value, `${prefix}${key}.`),
  );
}

describe('message catalogs', () => {
  it('French holds every namespace the pages use', () => {
    expect(Object.keys(fr)).toEqual(
      expect.arrayContaining(['Footer', 'GuestEntry', 'Home', 'Metadata', 'NotFound', 'Play', 'Room']),
    );
  });

  it('every English namespace has exactly the keys of its French namespace', () => {
    for (const namespace of Object.keys(en) as (keyof typeof en)[]) {
      expect(keyPaths(en[namespace]).sort(), namespace).toEqual(keyPaths(fr[namespace]).sort());
    }
  });
});

describe('fallback catalogs for the global error page', () => {
  it.each([
    ['fr', fr, frFallback],
    ['en', en, enFallback],
  ])('%s slice matches the main catalog', (_locale, main, fallback) => {
    expect(fallback).toEqual({ ServerError: main.ServerError, Footer: main.Footer });
  });
});
