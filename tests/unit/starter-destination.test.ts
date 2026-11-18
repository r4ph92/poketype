import { describe, expect, it } from 'vitest';
import type { InvitationToken } from '../../src/domain/invitation-token';
import type { RoomId } from '../../src/domain/room-id';
import { chooseStarterPath, encodeStarterDestination, hubDestination, parseStarterDestination, pathOf, type StarterDestination } from '../../src/domain/starter-destination';

const roomId = '0b9f7c1e-0000-4000-8000-000000000000' as RoomId;
const token = 'Kq3_x-Zr8vN2bT5mW9yA1cD4eF6gH7jL0pQsUoIiEe0' as InvitationToken;

describe('starter destination', () => {
  it.each<StarterDestination>([
    { kind: 'room', roomId },
    { kind: 'find-race' },
    { kind: 'create-room', visibility: 'unlisted' },
    { kind: 'create-room', visibility: 'public' },
    { kind: 'create-room', visibility: 'private' },
    { kind: 'invite', token },
  ])('round-trips %o through the starter screen address', (destination) => {
    expect(parseStarterDestination(encodeStarterDestination(destination))).toEqual(destination);
  });

  it('sends the hub to the plain starter screen', () => {
    expect(chooseStarterPath(hubDestination)).toBe('/play/choose-starter');
    expect(chooseStarterPath({ kind: 'room', roomId })).toBe(`/play/choose-starter?next=room%3A${roomId}`);
  });

  it.each([null, undefined, '', '/rooms/x', 'https://evil.example', 'room:not-a-uuid', 'create-room:secret', 'invite:', `invite:${token}A`, `invite:${token.slice(1)}/`, '//evil.example', 42])(
    'falls back to the hub for %s',
    (value) => {
      expect(parseStarterDestination(value)).toEqual(hubDestination);
    },
  );

  it('redirects a page to the room, the invitation link or the hub', () => {
    expect(pathOf({ kind: 'room', roomId })).toBe(`/rooms/${roomId}`);
    expect(pathOf({ kind: 'invite', token })).toBe(`/invite/${token}`);
    expect(chooseStarterPath({ kind: 'invite', token })).toBe(`/play/choose-starter?next=invite%3A${token}`);
    expect(pathOf({ kind: 'find-race' })).toBe('/play');
  });
});
