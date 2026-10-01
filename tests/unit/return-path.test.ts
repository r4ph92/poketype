import { describe, expect, it } from 'vitest';
import { safeReturnPath } from '../../src/domain/return-path';

describe('safeReturnPath', () => {
  it.each([
    ['/', '/'],
    ['/play', '/play'],
    ['/rooms/0b9f7c1e-0000-4000-8000-000000000000', '/rooms/0b9f7c1e-0000-4000-8000-000000000000'],
    ['/nimporte-quoi?q=1#top', '/nimporte-quoi?q=1'],
    ['/?room=0b9f7c1e-0000-4000-8000-000000000000', '/?room=0b9f7c1e-0000-4000-8000-000000000000'],
    ['/play?next=//evil.example', '/play?next=//evil.example'],
    ['/%C3%A9t%C3%A9', '/%C3%A9t%C3%A9'],
  ])('keeps the local path %s as %s', (value, expected) => {
    expect(safeReturnPath(value)).toBe(expected);
  });

  it.each([
    '//evil.example',
    '/a/..//evil.example',
    '/.//evil.example',
    '/a/../\\evil.example',
    '/\\evil.example',
    'https://evil.example',
    'javascript:alert(1)',
    'play',
    '',
    '/play\nSet-Cookie: a=b',
    '/pl\u0000ay',
    `/${'a'.repeat(2048)}`,
    null,
    undefined,
    42,
    new File([''], 'a.txt'),
  ])('falls back to the home page for %s', (value) => {
    expect(safeReturnPath(value)).toBe('/');
  });
});
