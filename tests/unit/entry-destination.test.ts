import { describe, expect, it } from 'vitest';
import type { InvitationToken } from '../../src/domain/invitation-token';
import type { RoomId } from '../../src/domain/room-id';
import { hubDestination, pathOf } from '../../src/domain/starter-destination';
import { entryReturnDestination, entryReturnQuery } from '../../src/features/guest/entry-destination';

const roomId = '0b8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b' as RoomId;
const token = 'Kq3_x-Zr8vN2bT5mW9yA1cD4eF6gH7jL0pQsUoIiEe0' as InvitationToken;

describe('where a visitor goes once they have a trainer', () => {
  it('returns to the room the visitor was invited to', () => {
    expect(pathOf(entryReturnDestination({ returnRoomId: roomId }))).toBe(`/rooms/${roomId}`);
  });

  it('returns to the personal invitation link the visitor opened', () => {
    expect(entryReturnDestination({ inviteToken: token })).toEqual({ kind: 'invite', token });
    expect(pathOf(entryReturnDestination({ returnRoomId: roomId, inviteToken: token }))).toBe(`/invite/${token}`);
  });

  it.each([{}, { returnRoomId: 'not-a-room' }, { inviteToken: `${token}x` }, { inviteToken: ['x'] }, { returnRoomId: null, inviteToken: null }])(
    'goes to the play page without a valid return: %j',
    (entryReturn) => {
      expect(entryReturnDestination(entryReturn)).toEqual(hubDestination);
      expect(pathOf(entryReturnDestination(entryReturn))).toBe('/play');
    },
  );

  it('keeps the return in the log-in link', () => {
    expect(entryReturnQuery({ kind: 'invite', token })).toBe(`?invite=${token}`);
    expect(entryReturnQuery({ kind: 'room', roomId })).toBe(`?room=${roomId}`);
    expect(entryReturnQuery(hubDestination)).toBe('');
  });
});
