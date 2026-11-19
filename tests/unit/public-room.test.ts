import { describe, expect, it } from 'vitest';
import { canJoinPublicRoom, type PublicRoom } from '../../src/domain/public-room';

const base: PublicRoom = { roomId: '0b8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b', hostName: 'Maya', playerCount: 3, capacity: 10, wordCount: 40, textLanguage: 'fr', complexity: 'easy', state: 'waiting' } as PublicRoom;

describe('which public rooms offer a join', () => {
  it('offers a waiting room and a room on its results screen with a free seat', () => {
    expect(canJoinPublicRoom({ ...base, state: 'waiting' })).toBe(true);
    expect(canJoinPublicRoom({ ...base, state: 'results' })).toBe(true);
  });

  it('never offers a race in progress', () => {
    expect(canJoinPublicRoom({ ...base, state: 'running' })).toBe(false);
  });

  it('does not offer a results room that is at capacity', () => {
    expect(canJoinPublicRoom({ ...base, state: 'results', playerCount: 10 })).toBe(false);
  });
});
