import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import { acceptsTypingAt, hasEnoughPlayersToStart, raceStartsAt } from '../../src/domain/race';

describe('race start rules', () => {
  it('one player is not enough to start; two are', () => {
    expect(hasEnoughPlayersToStart(0)).toBe(false);
    expect(hasEnoughPlayersToStart(1)).toBe(false);
    expect(hasEnoughPlayersToStart(2)).toBe(true);
    expect(hasEnoughPlayersToStart(5)).toBe(true);
  });

  it('starts after the sync lead time and the full countdown', () => {
    const requestedAt = new Date('2026-09-30T10:00:00.000Z');
    const { syncLeadMs, countdownSeconds } = gameConfig.race;
    expect(raceStartsAt(requestedAt).getTime() - requestedAt.getTime()).toBe(syncLeadMs + countdownSeconds * 1000);
  });
});

describe('typing window', () => {
  const startsAt = new Date('2026-09-30T10:00:05.000Z');

  it('accepts typing from the start time on, never a millisecond before', () => {
    expect(acceptsTypingAt(startsAt, new Date(startsAt.getTime() - 1))).toBe(false);
    expect(acceptsTypingAt(startsAt, startsAt)).toBe(true);
    expect(acceptsTypingAt(startsAt, new Date(startsAt.getTime() + 60_000))).toBe(true);
  });
});
