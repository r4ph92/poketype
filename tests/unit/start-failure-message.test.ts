import { describe, expect, it } from 'vitest';
import { startFailureMessageKey } from '@/features/rooms/start-failure-message';

describe('startFailureMessageKey', () => {
  it('explains a text the server cannot draw', () => {
    expect(startFailureMessageKey(422)).toBe('startImpossibleText');
  });

  it.each([0, 403, 409, 500, null])('keeps the generic message for %s', (status) => {
    expect(startFailureMessageKey(status)).toBe('startFailed');
  });
});
