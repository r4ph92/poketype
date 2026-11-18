import { gameConfig } from '@/config/game';

// The most racers a room seats, players and bots alike (SALLE-05, CONF-11).
export type RoomCapacity = number;

const { minimum, maximum } = gameConfig.rooms.capacity;

export const defaultRoomCapacity: RoomCapacity = gameConfig.rooms.capacity.default;

export const roomCapacityRange = { minimum, maximum } as const;

export function isRoomCapacity(value: unknown): value is RoomCapacity {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}

export function hasFreeSeat(capacity: RoomCapacity, racerCount: number): boolean {
  return racerCount < capacity;
}

// Lowering the capacity never removes anyone, so it may not drop under the racers already seated.
export function isBelowRacers(capacity: RoomCapacity, racerCount: number): boolean {
  return capacity < racerCount;
}
