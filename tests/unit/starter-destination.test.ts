import { describe, expect, it } from 'vitest';
import type { RoomId } from '../../src/domain/room-id';
import { chooseStarterPath, encodeStarterDestination, hubDestination, parseStarterDestination, pathOf, type StarterDestination } from '../../src/domain/starter-destination';

const roomId = '0b9f7c1e-0000-4000-8000-000000000000' as RoomId;

describe('starter destination', () => {
  it.each<StarterDestination>([
    { kind: 'room', roomId },
    { kind: 'find-race' },
    { kind: 'create-room', visibility: 'unlisted' },
    { kind: 'create-room', visibility: 'public' },
  ])('round-trips %o through the starter screen address', (destination) => {
    expect(parseStarterDestination(encodeStarterDestination(destination))).toEqual(destination);
  });

  it('sends the hub to the plain starter screen', () => {
    expect(chooseStarterPath(hubDestination)).toBe('/play/choose-starter');
    expect(chooseStarterPath({ kind: 'room', roomId })).toBe(`/play/choose-starter?next=room%3A${roomId}`);
  });

  it.each([null, undefined, '', '/rooms/x', 'https://evil.example', 'room:not-a-uuid', 'create-room:private', '//evil.example', 42])(
    'falls back to the hub for %s',
    (value) => {
      expect(parseStarterDestination(value)).toEqual(hubDestination);
    },
  );

  it('redirects a page to the room or the hub', () => {
    expect(pathOf({ kind: 'room', roomId })).toBe(`/rooms/${roomId}`);
    expect(pathOf({ kind: 'find-race' })).toBe('/play');
  });
});
