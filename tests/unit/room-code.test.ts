import { describe, expect, it } from 'vitest';
import { generateRoomCode, normalizeRoomCode, parseRoomCode, roomCodeAlphabet } from '../../src/domain/room-code';

describe('room codes', () => {
  it('use 32 characters without O, 0, I or 1', () => {
    expect(roomCodeAlphabet).toHaveLength(32);
    expect(roomCodeAlphabet).not.toMatch(/[O0I1]/);
  });

  it('are drawn as six characters of the alphabet', () => {
    let draw = 0;
    const code = generateRoomCode((alphabetSize) => draw++ % alphabetSize);

    expect(code).toBe('ABCDEF');
    expect(generateRoomCode((alphabetSize) => alphabetSize - 1)).toBe('999999');
  });

  it('accept what a player types in any letter case and with spaces', () => {
    expect(normalizeRoomCode('k7m2qx')).toBe('K7M2QX');
    expect(normalizeRoomCode('  K7m 2Qx \t')).toBe('K7M2QX');
  });

  it.each([
    ['an empty field', ''],
    ['a code too short', 'K7M2Q'],
    ['a code too long', 'K7M2QXA'],
    ['an O instead of a zero', 'K7M2QO'],
    ['a one', 'K7M2Q1'],
    ['an accented letter', 'K7M2QÉ'],
  ])('refuse %s', (_case, typed) => {
    expect(normalizeRoomCode(typed)).toBeNull();
  });

  it('parse only the canonical stored form', () => {
    expect(parseRoomCode('K7M2QX')).toBe('K7M2QX');
    expect(parseRoomCode('k7m2qx')).toBeNull();
    expect(parseRoomCode(42)).toBeNull();
  });
});
