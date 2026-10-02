import { describe, expect, it } from 'vitest';
import { parseRevisionPing, revisionEvent, revisionPing, roomChannelName, roomIdOfChannel } from '../../src/domain/room-channel';
import type { RoomId } from '../../src/domain/room-id';

const roomId = '0b8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b' as RoomId;

describe('room channel', () => {
  it('is a private channel named after the room, so subscribing needs the server to authorize it', () => {
    expect(roomChannelName(roomId)).toBe(`private-room-${roomId}`);
    expect(roomIdOfChannel(roomChannelName(roomId))).toBe(roomId);
  });

  it('reads no room out of a channel that is not a room channel', () => {
    expect(roomIdOfChannel(`presence-room-${roomId}`)).toBeNull();
    expect(roomIdOfChannel('private-room-../../admin')).toBeNull();
    expect(roomIdOfChannel(`private-room-${roomId.toUpperCase()}`)).toBeNull();
  });

  it('pings with the revision alone, so a subscription that outlives a session change leaks no room data', () => {
    expect(revisionEvent).toBe('revision');
    expect(revisionPing(7)).toStrictEqual({ revision: 7 });
  });

  it('accepts only a whole revision number from a ping', () => {
    expect(parseRevisionPing({ revision: 12 })).toBe(12);
    expect(parseRevisionPing({ revision: '12' })).toBeNull();
    expect(parseRevisionPing({ revision: 1.5 })).toBeNull();
    expect(parseRevisionPing(null)).toBeNull();
    expect(parseRevisionPing('{"revision":12}')).toBeNull();
  });
});
