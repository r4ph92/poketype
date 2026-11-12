import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import { acceptsTypingAt, hasEnoughPlayersToStart, isPastDeadline, raceStartsAt } from '../../src/domain/race';
import { isTimeLimit, raceDeadline } from '../../src/domain/time-limit';

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

describe('time limit', () => {
  const startsAt = new Date('2026-09-30T10:00:05.000Z');

  it('ends the race the chosen number of seconds after the start, so the countdown never eats typing time', () => {
    expect(raceDeadline(startsAt, 60).getTime() - startsAt.getTime()).toBe(60_000);
  });

  it('without a limit, still ends the race at the safety ceiling', () => {
    expect(raceDeadline(startsAt, null).getTime() - startsAt.getTime()).toBe(gameConfig.race.timeLimit.safetyCeilingSeconds * 1000);
  });

  it('offers none or 30 s to 10 min in 30-second steps, and refuses anything else', () => {
    expect([null, 30, 60, 300, 600].every(isTimeLimit)).toBe(true);
    expect([10, 45, 630, 660, 0, -30, 300.5, '300', undefined, Number.NaN].some(isTimeLimit)).toBe(false);
  });

  it('is past from the deadline itself on, never a millisecond before', () => {
    const deadlineAt = raceDeadline(startsAt, 300);
    expect(isPastDeadline(deadlineAt, new Date(deadlineAt.getTime() - 1))).toBe(false);
    expect(isPastDeadline(deadlineAt, deadlineAt)).toBe(true);
    expect(isPastDeadline(deadlineAt, new Date(deadlineAt.getTime() + 1))).toBe(true);
  });
});
