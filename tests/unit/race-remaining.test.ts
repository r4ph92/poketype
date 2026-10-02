import { describe, expect, it } from 'vitest';
import { formatRemainingTime, msUntilNextRemainingChange, remainingSecondsAt } from '../../src/domain/race-remaining';
import { ServerClock } from '../../src/domain/server-clock';

const deadlineAt = 10_000_000;

describe('time remaining', () => {
  it.each([
    [180_000, 180],
    [179_001, 180],
    [179_000, 179],
    [1_001, 2],
    [1_000, 1],
    [1, 1],
  ])('with %i ms left it shows %i seconds', (remainingMs, shown) => {
    expect(remainingSecondsAt(deadlineAt, deadlineAt - remainingMs)).toBe(shown);
  });

  it('shows 0 from the deadline on, never a negative number', () => {
    expect(remainingSecondsAt(deadlineAt, deadlineAt)).toBe(0);
    expect(remainingSecondsAt(deadlineAt, deadlineAt + 60_000)).toBe(0);
  });

  it('wakes at the next whole second, and never again once the deadline has passed', () => {
    expect(msUntilNextRemainingChange(deadlineAt, deadlineAt - 179_250)).toBe(250);
    expect(msUntilNextRemainingChange(deadlineAt, deadlineAt - 1_000)).toBe(1_000);
    expect(msUntilNextRemainingChange(deadlineAt, deadlineAt - 1)).toBe(1);
    expect(msUntilNextRemainingChange(deadlineAt, deadlineAt)).toBeNull();
  });

  it('two computers with clocks two minutes apart show the same seconds, because both read the server clock', () => {
    const serverNow = deadlineAt - 42_400;
    const onTime = ServerClock.empty(5).withSample({ serverNow, sentAt: 1_000, receivedAt: 1_040 });
    const skewed = ServerClock.empty(5).withSample({ serverNow, sentAt: 121_000, receivedAt: 121_040 });
    const shownOnTime = remainingSecondsAt(deadlineAt, onTime.serverNowAt(1_500)!);
    const shownSkewed = remainingSecondsAt(deadlineAt, skewed.serverNowAt(121_500)!);
    expect(shownSkewed).toBe(shownOnTime);
  });

  it.each([
    [180, '3:00'],
    [179, '2:59'],
    [61, '1:01'],
    [9, '0:09'],
    [0, '0:00'],
  ])('formats %i seconds as %s', (seconds, text) => {
    expect(formatRemainingTime(seconds)).toBe(text);
  });
});
