import { describe, expect, it } from 'vitest';
import { isLoginLocked } from '../../src/domain/login-lock';

const rules = { maxFailures: 5, windowMinutes: 5, lockMinutes: 5 };
const minutes = (value: number) => value * 60;

describe('login lock', () => {
  it('stays open below the number of allowed failures', () => {
    expect(isLoginLocked([0, 10, 20, 30].map(minutes), rules)).toBe(false);
  });

  it('locks after five failures within five minutes', () => {
    expect(isLoginLocked([0, 1, 2, 3, 4].map(minutes), rules)).toBe(true);
  });

  it('locks when the five failures span exactly the window', () => {
    expect(isLoginLocked([0, 1, 2, 3, 5].map(minutes), rules)).toBe(true);
  });

  it('stays open when the five latest failures span more than the window', () => {
    expect(isLoginLocked([0, 1, 2, 3, 5.1].map(minutes), rules)).toBe(false);
  });

  it('stays locked until five minutes after the latest failure', () => {
    expect(isLoginLocked([4.9, 5, 6, 7, 8].map(minutes), rules)).toBe(true);
  });

  it('opens again five minutes after the latest failure', () => {
    expect(isLoginLocked([5, 6, 7, 8, 9].map(minutes), rules)).toBe(false);
  });

  it('looks only at the five latest failures', () => {
    expect(isLoginLocked([0, 1, 2, 3, 4, 60, 61].map(minutes), rules)).toBe(true);
  });

  it('reads its rules from the game config by default', () => {
    expect(isLoginLocked([0, 0, 0, 0, 0])).toBe(true);
  });
});
