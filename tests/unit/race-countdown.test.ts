import { describe, expect, it } from 'vitest';
import { countdownAt, msUntilNextCountdownChange } from '../../src/domain/race-countdown';

const startsAt = 1_000_000;

describe('race countdown', () => {
  it('asks the players to get ready until three seconds remain', () => {
    expect(countdownAt(startsAt, startsAt - 4500)).toBe('get-ready');
    expect(countdownAt(startsAt, startsAt - 3001)).toBe('get-ready');
  });

  it.each([
    [3000, 3],
    [2001, 3],
    [2000, 2],
    [1001, 2],
    [1000, 1],
    [1, 1],
  ])('with %i ms left it shows %i', (remainingMs, shown) => {
    expect(countdownAt(startsAt, startsAt - remainingMs)).toBe(shown);
  });

  it('says go at the start time', () => {
    expect(countdownAt(startsAt, startsAt)).toBe('go');
  });

  it('long after the start it is go, never negative', () => {
    expect(countdownAt(startsAt, startsAt + 60_000)).toBe('go');
  });

  it.each([
    [4500, 1500],
    [3001, 1],
    [3000, 1000],
    [2500, 500],
    [2000, 1000],
    [1, 1],
  ])('with %i ms left the next change comes in %i ms', (remainingMs, delayMs) => {
    expect(msUntilNextCountdownChange(startsAt, startsAt - remainingMs)).toBe(delayMs);
  });

  it('has no next change once it says go', () => {
    expect(msUntilNextCountdownChange(startsAt, startsAt)).toBeNull();
    expect(msUntilNextCountdownChange(startsAt, startsAt + 10)).toBeNull();
  });
});
