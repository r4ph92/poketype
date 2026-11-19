import { describe, expect, it } from 'vitest';
import type { PublicRoom } from '../../src/domain/public-room';
import { filterQueryString, roomMatchesFilter } from '../../src/domain/public-room-filter';
import { parsePublicRoomFilter } from '../../src/server/validation/public-room-filter-schema';

const englishRoom = { textLanguage: 'en' } as PublicRoom;

describe('the public room filter in the address', () => {
  it('reads a known language', () => {
    expect(parsePublicRoomFilter({ langue: 'en' })).toEqual({ language: 'en' });
    expect(parsePublicRoomFilter({ langue: 'fr' })).toEqual({ language: 'fr' });
  });

  it('shows every room, without an error, for an unknown, repeated or missing value', () => {
    for (const parameters of [{ langue: 'de' }, { langue: '' }, { langue: ['en', 'fr'] }, { langue: 'EN' }, {}, { other: 'en' }]) {
      expect(parsePublicRoomFilter(parameters)).toEqual({ language: undefined });
    }
  });

  it('writes the filter back to the address, and nothing when no filter is applied', () => {
    expect(filterQueryString({ language: 'en' })).toBe('?langue=en');
    expect(filterQueryString({})).toBe('');
  });

  it('keeps the rooms of the chosen language only', () => {
    expect(roomMatchesFilter(englishRoom, { language: 'en' })).toBe(true);
    expect(roomMatchesFilter(englishRoom, { language: 'fr' })).toBe(false);
    expect(roomMatchesFilter(englishRoom, {})).toBe(true);
  });
});
