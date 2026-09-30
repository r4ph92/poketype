import { describe, expect, it } from 'vitest';
import { parseRoomId, roomPath, type RoomId } from '../../src/domain/room-id';
import { destinationAfterEntry } from '../../src/features/guest/entry-destination';

const roomId = '0b8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b';

describe('parseRoomId', () => {
  it('accepts a lowercase canonical uuid', () => {
    expect(parseRoomId(roomId)).toBe(roomId);
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
    ['an absolute url', `https://evil.example/rooms/${roomId}`],
    ['a protocol-relative url', `//evil.example/${roomId}`],
    ['a path', `/rooms/${roomId}/../x`],
  ])('rejects %s', (_label, value) => {
    expect(parseRoomId(value)).toBeNull();
  });

  it.each([
    ['a repeated query parameter', [roomId, roomId]],
    ['a missing value', undefined],
    ['a missing form field', null],
    ['a number', 42],
  ])('rejects %s', (_label, value) => {
    expect(parseRoomId(value)).toBeNull();
  });
});

describe('roomPath', () => {
  it('is the room page address', () => {
    expect(roomPath(roomId as RoomId)).toBe(`/rooms/${roomId}`);
  });
});

describe('destinationAfterEntry', () => {
  it('returns to the room the visitor was invited to', () => {
    expect(destinationAfterEntry(roomId as RoomId)).toBe(`/rooms/${roomId}`);
  });

  it('goes to the play page without an invitation', () => {
    expect(destinationAfterEntry(null)).toBe('/play');
  });
});
