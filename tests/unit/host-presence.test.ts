import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import { hostPresenceWorkOf, type HostPresence } from '../../src/domain/host-presence';
import { isHostAway, isHostSeenStale } from '../../src/domain/member-presence';
import type { RoomPhase } from '../../src/domain/room-phase';

const { connectedWithinMs, hostAwayAfterMs, hostTouchEveryMs } = gameConfig.rooms.memberPresence;
const { waitingPollIntervalMs } = gameConfig.roomSync;
const now = 1_790_000_000_000;

function presence(silentMs: number, overrides: Partial<HostPresence> = {}): HostPresence {
  return { phase: 'waiting', hostSeenAt: now - silentMs, isMarkedAway: false, ...overrides };
}

describe('host away threshold (#44)', () => {
  it('tells the others within 5 seconds, counting the last host write and one poll of theirs', () => {
    expect(hostAwayAfterMs + waitingPollIntervalMs).toBeLessThan(5_000);
  });

  it('leaves a connected host polling every second at least two polls of margin before being shown away', () => {
    expect(hostAwayAfterMs).toBeGreaterThanOrEqual(hostTouchEveryMs + 2 * waitingPollIntervalMs);
  });

  it('shows the host as away once silent for the threshold', () => {
    expect(isHostAway(now - hostAwayAfterMs + 1, now)).toBe(false);
    expect(isHostAway(now - hostAwayAfterMs, now)).toBe(true);
  });

  it('writes the host’s own sighting once per host touch interval', () => {
    expect(isHostSeenStale(now - hostTouchEveryMs + 1, now)).toBe(false);
    expect(isHostSeenStale(now - hostTouchEveryMs, now)).toBe(true);
  });
});

describe('hostPresenceWorkOf (SALLE-08, COURSE-08)', () => {
  it('does nothing while the host is heard from', () => {
    expect(hostPresenceWorkOf(presence(0), now)).toBeNull();
  });

  it('marks the host away once silent for the away threshold, once', () => {
    expect(hostPresenceWorkOf(presence(hostAwayAfterMs), now)).toBe('mark-away');
    expect(hostPresenceWorkOf(presence(hostAwayAfterMs, { isMarkedAway: true }), now)).toBeNull();
  });

  it('clears the mark when the host comes back within 30 seconds', () => {
    expect(hostPresenceWorkOf(presence(0, { isMarkedAway: true }), now)).toBe('clear-away');
  });

  it('passes the role once the host has been silent for 30 seconds, marked or not', () => {
    expect(hostPresenceWorkOf(presence(connectedWithinMs - 1, { isMarkedAway: true }), now)).toBeNull();
    expect(hostPresenceWorkOf(presence(connectedWithinMs, { isMarkedAway: true }), now)).toBe('pass');
    expect(hostPresenceWorkOf(presence(connectedWithinMs), now)).toBe('pass');
  });

  it('applies on the results as in the waiting room', () => {
    expect(hostPresenceWorkOf(presence(connectedWithinMs, { phase: 'results' }), now)).toBe('pass');
    expect(hostPresenceWorkOf(presence(hostAwayAfterMs, { phase: 'results' }), now)).toBe('mark-away');
  });

  it.each<RoomPhase>(['countdown', 'racing', 'closed'])('lets a %s room go on without its host', (phase) => {
    expect(hostPresenceWorkOf(presence(connectedWithinMs * 2, { phase }), now)).toBeNull();
  });
});
