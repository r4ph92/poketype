import { describe, expect, it } from 'vitest';
import type { InvitationToken } from '../../src/domain/invitation-token';
import type { RoomId } from '../../src/domain/room-id';
import { invitationStorageKey, parseStoredLinks, readStoredLinksText, rememberLink } from '../../src/features/rooms/invitations/invitation-link-store';
import { outcomeOf } from '../../src/features/rooms/invitations/request-invitation';

const roomId = '0b8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b' as RoomId;
const token = 'Kq3_x-Zr8vN2bT5mW9yA1cD4eF6gH7jL0pQsUoIiEe0' as InvitationToken;

describe('the answer to "Créer une invitation"', () => {
  it('reads the new link', () => {
    expect(outcomeOf(201, { id: 'a', token })).toEqual({ outcome: 'created', invitation: { id: 'a', token } });
  });

  it('tells the host the room holds the maximum', () => {
    expect(outcomeOf(409, { result: 'too-many' })).toEqual({ outcome: 'too-many' });
  });

  it.each([
    [403, null],
    [409, null],
    [201, { id: 'a', token: 'short' }],
    [201, { id: '', token }],
    [201, null],
    [500, { id: 'a', token }],
  ])('reads %i %j as a failure', (status, json) => {
    expect(outcomeOf(status, json)).toEqual({ outcome: 'failed' });
  });
});

describe('the links this tab created', () => {
  it('keys them by room and by the viewer, so another trainer on the tab never sees them', () => {
    expect(invitationStorageKey(roomId, 'member-1')).not.toBe(invitationStorageKey(roomId, 'member-2'));
  });

  it('keeps only well-formed tokens', () => {
    expect(parseStoredLinks(JSON.stringify({ a: token, b: 'altered', c: 3 }))).toEqual({ a: token });
    expect(parseStoredLinks('not json')).toEqual({});
    expect(parseStoredLinks(null)).toEqual({});
    expect(parseStoredLinks('["x"]')).toEqual({});
  });

  it('remembers each new link even where session storage is missing', () => {
    const key = invitationStorageKey(roomId, 'member-3');
    rememberLink(key, 'a', token);
    rememberLink(key, 'b', token);
    expect(parseStoredLinks(readStoredLinksText(key))).toEqual({ a: token, b: token });
  });
});
