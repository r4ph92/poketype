import { describe, expect, it } from 'vitest';
import { isWellFormedRoomId } from '../../src/domain/room-id';

describe('isWellFormedRoomId', () => {
  it('accepts a lowercase canonical uuid', () => {
    expect(isWellFormedRoomId('0b8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b')).toBe(true);
  });

  it.each([
    ['uppercase', '0B8F5E4C-2F6A-4D1E-9C3B-7A1D2E3F4A5B'],
    ['missing dashes', '0b8f5e4c2f6a4d1e9c3b7a1d2e3f4a5b'],
    ['too long', '0b8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b0'],
    ['trailing newline', '0b8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b\n'],
    ['empty', ''],
    ['script', '<script>alert(1)</script>'],
    ['non-hex letters', 'zb8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b'],
    ['very long', 'a'.repeat(2000)],
  ])('rejects %s', (_label, value) => {
    expect(isWellFormedRoomId(value)).toBe(false);
  });
});
