import { describe, expect, it } from 'vitest';
import { parseInvitationToken } from '../../src/domain/invitation-token';
import { createInvitationToken, hashInvitationToken } from '../../src/server/invitations/invitation-token';
import { invitationStatusByOutcome, namedInvitationRefusals } from '../../src/server/invitations/invitation-status';
import { refusalOf } from '../../src/server/rooms/join-room-by-code';
import { invitationRequestSchema } from '../../src/server/validation/room-schemas';

describe('invitation tokens', () => {
  it('carries 256 random bits as a well-formed link token', () => {
    const token = createInvitationToken();
    expect(Buffer.from(token, 'base64url')).toHaveLength(32);
    expect(parseInvitationToken(token)).toBe(token);
  });

  it('never repeats a token', () => {
    const tokens = new Set(Array.from({ length: 200 }, createInvitationToken));
    expect(tokens.size).toBe(200);
  });

  it('stores a hash that does not reveal the token, and an altered token has another hash', () => {
    const token = createInvitationToken();
    const altered = `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`;
    expect(hashInvitationToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInvitationToken(token)).not.toContain(token);
    expect(hashInvitationToken(altered)).not.toBe(hashInvitationToken(token));
  });
});

describe('the invitation request', () => {
  it('accepts an empty body only', () => {
    expect(invitationRequestSchema.safeParse({}).success).toBe(true);
    expect(invitationRequestSchema.safeParse({ hostGuestId: 'zoe' }).success).toBe(false);
    expect(invitationRequestSchema.safeParse({ roomId: 'other' }).success).toBe(false);
    expect(invitationRequestSchema.safeParse(null).success).toBe(false);
    expect(invitationRequestSchema.safeParse([]).success).toBe(false);
  });

  it('refuses a player who is not the host, and anyone outside the room', () => {
    expect(invitationStatusByOutcome['not-host']).toBe(403);
    expect(invitationStatusByOutcome['not-member']).toBe(403);
    expect(invitationStatusByOutcome['not-found']).toBe(404);
  });

  it('answers a created link with 201 and names only the cap among the conflicts', () => {
    expect(invitationStatusByOutcome.created).toBe(201);
    expect([invitationStatusByOutcome['too-many'], invitationStatusByOutcome['public-room'], invitationStatusByOutcome['race-started']]).toEqual([409, 409, 409]);
    expect([...namedInvitationRefusals]).toEqual(['too-many']);
  });
});

describe('joining a private room by its code', () => {
  it('tells the player an invitation is needed instead of calling the code unknown', () => {
    expect(refusalOf.private).toBe('private');
    expect(refusalOf['not-found']).toBe('unknown');
  });
});
