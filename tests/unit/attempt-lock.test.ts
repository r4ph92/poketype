import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import { isAttemptLocked } from '../../src/domain/attempt-lock';

const rules = { maxFailures: 5, windowMinutes: 5, lockMinutes: 5 };
const minutes = (value: number) => value * 60;

describe('attempt lock', () => {
  it('stays open below the number of allowed failures', () => {
    expect(isAttemptLocked([0, 10, 20, 30].map(minutes), rules)).toBe(false);
  });

  it('locks after five failures within five minutes', () => {
    expect(isAttemptLocked([0, 1, 2, 3, 4].map(minutes), rules)).toBe(true);
  });

  it('locks when the five failures span exactly the window', () => {
    expect(isAttemptLocked([0, 1, 2, 3, 5].map(minutes), rules)).toBe(true);
  });

  it('stays open when the five latest failures span more than the window', () => {
    expect(isAttemptLocked([0, 1, 2, 3, 5.1].map(minutes), rules)).toBe(false);
  });

  it('stays locked until five minutes after the latest failure', () => {
    expect(isAttemptLocked([4.9, 5, 6, 7, 8].map(minutes), rules)).toBe(true);
  });

  it('opens again five minutes after the latest failure', () => {
    expect(isAttemptLocked([5, 6, 7, 8, 9].map(minutes), rules)).toBe(false);
  });

  it('looks only at the five latest failures', () => {
    expect(isAttemptLocked([0, 1, 2, 3, 4, 60, 61].map(minutes), rules)).toBe(true);
  });

  it('locks a login key after the five failures of the login config', () => {
    expect(isAttemptLocked([0, 0, 0, 0, 0], gameConfig.account.loginThrottle)).toBe(true);
  });
});
