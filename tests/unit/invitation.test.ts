import { describe, expect, it } from 'vitest';
import type { GuestId } from '../../src/domain/guest-id';
import { parseInvitationViews, redemptionOutcome, type InvitationUse, type RedemptionRequest } from '../../src/domain/invitation';
import { invitationEntryPath, invitationPath, parseInvitationToken } from '../../src/domain/invitation-token';
import type { RoomPhase } from '../../src/domain/room-phase';

const zoe = { guestId: 'zoe' as GuestId, addressKey: 'address-zoe' };
const nina = { guestId: 'nina' as GuestId, addressKey: 'address-nina' };
const fresh: InvitationUse = { usedByGuestId: null, usedAddressKey: null };
const usedByZoe: InvitationUse = { usedByGuestId: zoe.guestId, usedAddressKey: zoe.addressKey };

function outcome(use: InvitationUse, redeemer: RedemptionRequest['redeemer'], phase: RoomPhase = 'waiting', isMember = false) {
  return redemptionOutcome({ use, redeemer, phase, isMember });
}

describe('redeeming an invitation', () => {
  it('lets the first person through a fresh link join the waiting room', () => {
    expect(outcome(fresh, zoe)).toBe('join');
  });

  it.each<RoomPhase>(['countdown', 'racing', 'results'])('keeps a fresh link unused once the race has started (%s)', (phase) => {
    expect(outcome(fresh, zoe, phase)).toBe('race-started');
  });

  it('refuses a used link to someone else on another address', () => {
    expect(outcome(usedByZoe, nina)).toBe('used');
    expect(outcome(usedByZoe, nina, 'results')).toBe('used');
  });

  it.each<RoomPhase>(['waiting', 'results'])('lets the first user come back while the room is %s', (phase) => {
    expect(outcome(usedByZoe, zoe, phase)).toBe('rejoin');
  });

  it('lets a new guest session from the first address come back, as a whole school shares one address', () => {
    expect(outcome(usedByZoe, { guestId: 'zoe-again' as GuestId, addressKey: zoe.addressKey })).toBe('rejoin');
  });

  it('binds the link to the guest when the platform reports no address', () => {
    const usedWithoutAddress: InvitationUse = { usedByGuestId: zoe.guestId, usedAddressKey: null };
    expect(outcome(usedWithoutAddress, { guestId: zoe.guestId, addressKey: null })).toBe('rejoin');
    expect(outcome(usedWithoutAddress, { guestId: nina.guestId, addressKey: null })).toBe('used');
  });

  it.each<RoomPhase>(['countdown', 'racing'])('does not let the first user back in during a race (%s)', (phase) => {
    expect(outcome(usedByZoe, zoe, phase)).toBe('race-started');
  });

  it('never claims a link for someone already in the room', () => {
    expect(outcome(fresh, zoe, 'waiting', true)).toBe('already-member');
    expect(outcome(usedByZoe, nina, 'racing', true)).toBe('already-member');
  });
});

describe('invitation token', () => {
  const token = 'A'.repeat(21) + '_-' + 'z9'.repeat(10);

  it('accepts a 43-character base64url token and builds its link', () => {
    const parsed = parseInvitationToken(token);
    expect(parsed).toBe(token);
    expect(invitationPath(parsed!)).toBe(`/invite/${token}`);
    expect(invitationEntryPath(parsed!)).toBe(`/?invite=${token}`);
  });

  it.each([undefined, null, 42, '', token.slice(1), `${token}A`, `${token.slice(1)}=`, `${token.slice(1)}/`, `${token.slice(1)}é`, ['x']])('refuses an altered value %j', (value) => {
    expect(parseInvitationToken(value)).toBeNull();
  });
});

describe('parseInvitationViews', () => {
  it('reads unused and used links', () => {
    const views = [
      { id: 'a', createdAt: 1_790_000_000_000, usedBy: null },
      { id: 'b', createdAt: 1_790_000_000_500, usedBy: 'Zoé' },
    ];
    expect(parseInvitationViews(views)).toEqual(views);
  });

  it('drops any field the host list does not show', () => {
    expect(parseInvitationViews([{ id: 'a', createdAt: 1, usedBy: null, token: 'secret' }])).toEqual([{ id: 'a', createdAt: 1, usedBy: null }]);
  });

  it.each([null, {}, [{ id: '', createdAt: 1, usedBy: null }], [{ id: 'a', createdAt: '1', usedBy: null }], [{ id: 'a', createdAt: 1, usedBy: 3 }], [{ id: 'a', createdAt: 1 }]])(
    'refuses a malformed list %j',
    (value) => {
      expect(parseInvitationViews(value)).toBeNull();
    },
  );
});
