import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import enFallback from '../../messages/fallback/en.json';
import frFallback from '../../messages/fallback/fr.json';
import fr from '../../messages/fr.json';

type Catalog = { [key: string]: string | Catalog };

function keyPaths(catalog: Catalog): string[] {
  return entries(catalog).map(([path]) => path);
}

function entries(catalog: Catalog, prefix = ''): [string, string][] {
  return Object.entries(catalog).flatMap(([key, value]) =>
    typeof value === 'string' ? [[`${prefix}${key}`, value] as [string, string]] : entries(value, `${prefix}${key}.`),
  );
}

describe('message catalogs', () => {
  it('French holds every namespace the pages use', () => {
    expect(Object.keys(fr)).toEqual(
      expect.arrayContaining(['Footer', 'GuestEntry', 'Home', 'Metadata', 'NotFound', 'Play', 'Room', 'SignUp', 'AccountBar']),
    );
  });

  it('English and French hold the same namespaces', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
  });

  it('every namespace has exactly the same keys in both languages', () => {
    for (const namespace of Object.keys(fr) as (keyof typeof fr)[]) {
      expect(keyPaths(en[namespace]).sort(), namespace).toEqual(keyPaths(fr[namespace]).sort());
    }
  });

  it('every key uses the same placeholders in both languages', () => {
    const placeholders = (catalog: Catalog) => Object.fromEntries(entries(catalog).map(([path, text]) => [path, [...text.matchAll(/\{(\w+)/g)].map((match) => match[1]).sort()]));
    expect(placeholders(en)).toEqual(placeholders(fr));
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
