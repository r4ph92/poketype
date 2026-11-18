import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import type { GuestId } from '../../src/domain/guest-id';
import { nextHostOf, type HostCandidate } from '../../src/domain/host-succession';
import { departedSeenAt, isConnected, isMemberSeenStale } from '../../src/domain/member-presence';

const { connectedWithinMs, touchEveryMs } = gameConfig.rooms.memberPresence;
const now = 1_790_000_000_000;

function member(name: string, joinedAt: number, overrides: Partial<HostCandidate> = {}): HostCandidate {
  return { memberId: `member-${name}`, guestId: name as GuestId, joinedAt, lastSeenAt: now - 1_000, hasLeft: false, ...overrides };
}

describe('nextHostOf (SALLE-08)', () => {
  it('passes the role to the member who joined first, whatever the list order', () => {
    const maya = member('maya', 1, { hasLeft: true });
    expect(nextHostOf([member('leo', 30), maya, member('zoe', 20)], now)).toBe('zoe');
  });

  it('skips a member whose page has not reached the server for 30 s', () => {
    const zoe = member('zoe', 20, { lastSeenAt: now - connectedWithinMs });
    expect(nextHostOf([zoe, member('leo', 30)], now)).toBe('leo');
  });

  it('skips the leaving host and anyone who abandoned the race', () => {
    const candidates = [member('maya', 1, { hasLeft: true }), member('zoe', 20, { hasLeft: true }), member('leo', 30)];
    expect(nextHostOf(candidates, now)).toBe('leo');
  });

  it('skips a member who left a running race after finishing, though their row stays and they joined first', () => {
    const leo = member('leo', 10, { lastSeenAt: departedSeenAt });
    expect(nextHostOf([member('maya', 1, { hasLeft: true }), leo, member('zoe', 20)], now)).toBe('zoe');
  });

  it('breaks a tie on the join time with the member id', () => {
    expect(nextHostOf([member('zoe', 20, { memberId: 'b' }), member('leo', 20, { memberId: 'a' })], now)).toBe('leo');
  });

  it('returns nobody when no connected member remains, so the room closes', () => {
    expect(nextHostOf([member('zoe', 20, { lastSeenAt: now - connectedWithinMs - 1 })], now)).toBeNull();
    expect(nextHostOf([], now)).toBeNull();
  });
});

describe('member presence', () => {
  it('counts a member seen within the window as connected', () => {
    expect(isConnected(now - connectedWithinMs + 1, now)).toBe(true);
    expect(isConnected(now - connectedWithinMs, now)).toBe(false);
  });

  it('refreshes a member’s own last-seen time at most once per touch interval', () => {
    expect(isMemberSeenStale(now - touchEveryMs + 1, now)).toBe(false);
    expect(isMemberSeenStale(now - touchEveryMs, now)).toBe(true);
  });
});
