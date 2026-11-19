import { describe, expect, it } from 'vitest';
import { canJoinPublicRoom, parsePublicRooms, type PublicRoom } from '../../src/domain/public-room';

const roomId = '0b8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b';

const resultsRoom = { roomId, hostName: 'Maya', playerCount: 9, capacity: 10, wordCount: 40, textLanguage: 'fr', complexity: 'easy', state: 'results' };

function parsedRoom(fields: Partial<typeof resultsRoom>): PublicRoom {
  return parsePublicRooms({ rooms: [{ ...resultsRoom, ...fields }] })![0]!;
}

describe('joining a public room on its results screen, as the list reads it from the server', () => {
  it('offers the last free seat of a results room', () => {
    expect(canJoinPublicRoom(parsedRoom({ playerCount: 9, capacity: 10 }))).toBe(true);
  });

  it('refuses a results room holding more racers than its capacity', () => {
    expect(canJoinPublicRoom(parsedRoom({ playerCount: 11, capacity: 10 }))).toBe(false);
  });

  it('never offers a race in progress, even with free seats', () => {
    expect(canJoinPublicRoom(parsedRoom({ state: 'running', playerCount: 2 }))).toBe(false);
  });

  it('rejects a raw countdown or racing phase sent as a list state', () => {
    expect(parsePublicRooms({ rooms: [{ ...resultsRoom, state: 'countdown' }] })).toBeNull();
    expect(parsePublicRooms({ rooms: [{ ...resultsRoom, state: 'racing' }] })).toBeNull();
  });
});
