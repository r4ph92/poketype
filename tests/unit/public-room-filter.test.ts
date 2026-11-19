import { describe, expect, it } from 'vitest';
import type { PublicRoom } from '../../src/domain/public-room';
import { filterQueryString, roomMatchesFilter } from '../../src/domain/public-room-filter';
import { parsePublicRoomFilter } from '../../src/server/validation/public-room-filter-schema';

const englishRoom = { textLanguage: 'en', complexity: 'medium' } as PublicRoom;

describe('the public room filter in the address', () => {
  it('reads a known language', () => {
    expect(parsePublicRoomFilter({ langue: 'en' })).toEqual({ language: 'en', complexity: undefined });
    expect(parsePublicRoomFilter({ langue: 'fr' })).toEqual({ language: 'fr', complexity: undefined });
  });

  it('shows every room, without an error, for an unknown, repeated or missing value', () => {
    for (const parameters of [{ langue: 'de' }, { langue: '' }, { langue: ['en', 'fr'] }, { langue: 'EN' }, {}, { other: 'en' }]) {
      expect(parsePublicRoomFilter(parameters)).toEqual({ language: undefined, complexity: undefined });
    }
  });

  it('reads a known complexity, and ignores an unknown, repeated or differently written one', () => {
    for (const level of ['easy', 'medium', 'hard'] as const) expect(parsePublicRoomFilter({ complexite: level })).toEqual({ language: undefined, complexity: level });
    for (const value of ['expert', '', ['easy', 'hard'], 'Easy', 'facile']) expect(parsePublicRoomFilter({ complexite: value })).toEqual({ language: undefined, complexity: undefined });
  });

  it('applies both filters at once, one of them being ignored when its value is unknown', () => {
    expect(parsePublicRoomFilter({ langue: 'en', complexite: 'hard' })).toEqual({ language: 'en', complexity: 'hard' });
    expect(parsePublicRoomFilter({ langue: 'en', complexite: 'x' })).toEqual({ language: 'en', complexity: undefined });
  });

  it('writes the filter back to the address, and nothing when no filter is applied', () => {
    expect(filterQueryString({ language: 'en' })).toBe('?langue=en');
    expect(filterQueryString({})).toBe('');
    expect(filterQueryString({ complexity: 'hard' })).toBe('?complexite=hard');
    expect(filterQueryString({ language: 'fr', complexity: 'easy' })).toBe('?langue=fr&complexite=easy');
  });

  it('keeps the rooms of the chosen language only', () => {
    expect(roomMatchesFilter(englishRoom, { language: 'en' })).toBe(true);
    expect(roomMatchesFilter(englishRoom, { language: 'fr' })).toBe(false);
    expect(roomMatchesFilter(englishRoom, {})).toBe(true);
  });

  it('keeps the rooms of the chosen complexity only, and both filters must hold', () => {
    expect(roomMatchesFilter(englishRoom, { complexity: 'medium' })).toBe(true);
    expect(roomMatchesFilter(englishRoom, { complexity: 'easy' })).toBe(false);
    expect(roomMatchesFilter(englishRoom, { language: 'en', complexity: 'medium' })).toBe(true);
    expect(roomMatchesFilter(englishRoom, { language: 'fr', complexity: 'medium' })).toBe(false);
  });
});
