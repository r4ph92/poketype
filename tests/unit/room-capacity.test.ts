import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import { defaultRoomCapacity, hasFreeSeat, isBelowRacers, isRoomCapacity } from '../../src/domain/room-capacity';
import { parsePublicRooms } from '../../src/domain/public-room';
import { capacityRequestSchema } from '../../src/server/validation/room-schemas';

describe('the room capacity', () => {
  it('opens every new room at 30 seats, the brief maximum', () => {
    expect(defaultRoomCapacity).toBe(30);
    expect(gameConfig.rooms.capacity).toEqual({ minimum: 2, maximum: 30, default: 30 });
  });

  it('accepts every whole number of seats from 2 to 30', () => {
    for (let seats = 2; seats <= 30; seats++) expect(isRoomCapacity(seats)).toBe(true);
  });

  it('refuses 1, 31, a fraction and anything that is not a number', () => {
    for (const value of [0, 1, 31, 2.5, Number.NaN, '12', null]) expect(isRoomCapacity(value)).toBe(false);
  });

  it('has a free seat until players and bots together reach the capacity', () => {
    expect(hasFreeSeat(5, 4)).toBe(true);
    expect(hasFreeSeat(5, 5)).toBe(false);
  });
});

describe('lowering the capacity', () => {
  it('cannot go below the racers already seated: 6 racers refuse 5 seats', () => {
    expect(isBelowRacers(5, 6)).toBe(true);
  });

  it('may go down to exactly the racers seated', () => {
    expect(isBelowRacers(6, 6)).toBe(false);
    expect(isBelowRacers(30, 6)).toBe(false);
  });
});

describe('the capacity request schema', () => {
  it('accepts a capacity in range', () => {
    expect(capacityRequestSchema.safeParse({ capacity: 2 }).success).toBe(true);
    expect(capacityRequestSchema.safeParse({ capacity: 30 }).success).toBe(true);
  });

  it.each([1, 31, 'abc', '12', 12.5, null])('refuses the capacity %s', (capacity) => {
    expect(capacityRequestSchema.safeParse({ capacity }).success).toBe(false);
  });

  it('refuses a missing capacity and any extra field', () => {
    expect(capacityRequestSchema.safeParse({}).success).toBe(false);
    expect(capacityRequestSchema.safeParse({ capacity: 10, roomId: 'other' }).success).toBe(false);
  });
});

describe('the public room list', () => {
  const room = { roomId: '0b8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b', hostName: 'Maya', playerCount: 3, wordCount: 40, textLanguage: 'fr', complexity: 'easy', state: 'waiting' };

  it('reads each room with its own capacity', () => {
    expect(parsePublicRooms({ rooms: [{ ...room, capacity: 5 }] })).toEqual([{ ...room, capacity: 5 }]);
  });

  it('rejects a list whose capacity is missing or out of range', () => {
    expect(parsePublicRooms({ rooms: [room] })).toBeNull();
    expect(parsePublicRooms({ rooms: [{ ...room, capacity: 31 }] })).toBeNull();
  });

  it('rejects a room whose text language, complexity or state is unknown', () => {
    expect(parsePublicRooms({ rooms: [{ ...room, capacity: 5, textLanguage: 'de' }] })).toBeNull();
    expect(parsePublicRooms({ rooms: [{ ...room, capacity: 5, complexity: 'expert' }] })).toBeNull();
    expect(parsePublicRooms({ rooms: [{ ...room, capacity: 5, state: 'closed' }] })).toBeNull();
  });
});
