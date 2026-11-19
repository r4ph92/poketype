import { describe, expect, it } from 'vitest';
import { startFailureMessageKey } from '@/features/rooms/start-failure-message';

describe('startFailureMessageKey', () => {
  it('explains picked characters that cannot fit a random text', () => {
    expect(startFailureMessageKey(422, 'random')).toBe('startImpossibleText');
  });

  it('says how long a coherent text can be when the server refuses a longer one', () => {
    expect(startFailureMessageKey(422, 'coherent')).toBe('textCoherentTooLong');
  });

  it.each([0, 403, 409, 500, null])('keeps the generic message for %s', (status) => {
    expect(startFailureMessageKey(status, 'coherent')).toBe('startFailed');
    expect(startFailureMessageKey(status, 'random')).toBe('startFailed');
  });
});
