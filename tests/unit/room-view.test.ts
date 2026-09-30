import { describe, expect, it } from 'vitest';
import { parseRoomSnapshot } from '../../src/domain/room-view';

const validSnapshot = {
  roomId: '0b8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b',
  phase: 'waiting',
  revision: 3,
  members: [
    { memberKey: 'a', trainerName: 'Alex', isHost: true, isViewer: false },
    { memberKey: 'b', trainerName: 'Zoé', isHost: false, isViewer: true },
  ],
};

describe('parseRoomSnapshot', () => {
  it('accepts a well-formed snapshot', () => {
    expect(parseRoomSnapshot(validSnapshot)).toEqual(validSnapshot);
  });

  it('keeps only the known member fields', () => {
    const withExtra = { ...validSnapshot, members: [{ ...validSnapshot.members[0], guestId: 'secret' }] };
    expect(parseRoomSnapshot(withExtra)?.members[0]).toEqual(validSnapshot.members[0]);
  });

  it.each([
    ['null', null],
    ['an array', [validSnapshot]],
    ['a string', 'snapshot'],
    ['an unknown phase', { ...validSnapshot, phase: 'lobby' }],
    ['a malformed room id', { ...validSnapshot, roomId: 'not-a-uuid' }],
    ['a revision given as text', { ...validSnapshot, revision: '3' }],
    ['a fractional revision', { ...validSnapshot, revision: 1.5 }],
    ['a zero revision', { ...validSnapshot, revision: 0 }],
    ['members that are not a list', { ...validSnapshot, members: {} }],
    ['a member without a name', { ...validSnapshot, members: [{ memberKey: 'a', isHost: true, isViewer: true }] }],
    ['a member with a text host flag', { ...validSnapshot, members: [{ ...validSnapshot.members[0], isHost: 'yes' }] }],
    ['a null member', { ...validSnapshot, members: [null] }],
  ])('rejects %s', (_label, json) => {
    expect(parseRoomSnapshot(json)).toBeNull();
  });
});
