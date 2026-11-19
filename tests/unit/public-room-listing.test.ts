import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import { resultsListedSince } from '../../src/domain/public-room-listing';

describe('how long a results room stays in the public list', () => {
  it('lists a room whose race ended less than the configured time ago, and no older one', () => {
    const now = new Date('2026-11-19T12:00:00Z');
    expect(resultsListedSince(now).getTime()).toBe(now.getTime() - gameConfig.publicRooms.resultsListedForMs);
    expect(gameConfig.publicRooms.resultsListedForMs).toBe(10 * 60_000);
  });
});
