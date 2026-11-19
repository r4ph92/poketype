import { isRoomCapacity, type RoomCapacity } from './room-capacity';
import { parseRoomId, type RoomId } from './room-id';
import { isWordCount } from './text-settings';

// A waiting room with a free seat, as the public list and the placement see it; playerCount counts its bots too.
export type PublicRoom = { roomId: RoomId; hostName: string; playerCount: number; capacity: RoomCapacity; wordCount: number };

export function parsePublicRooms(json: unknown): PublicRoom[] | null {
  if (!isObject(json) || !Array.isArray(json.rooms)) return null;
  const rooms = json.rooms.map(parsePublicRoom);
  return rooms.every((room) => room !== null) ? rooms : null;
}

function parsePublicRoom(value: unknown): PublicRoom | null {
  if (!isObject(value)) return null;
  const roomId = parseRoomId(value.roomId);
  const { hostName, playerCount, capacity, wordCount } = value;
  if (!roomId || typeof hostName !== 'string' || !isPositiveCount(playerCount) || !isRoomCapacity(capacity) || !isWordCount(wordCount)) return null;
  return { roomId, hostName, playerCount, capacity, wordCount };
}

function isPositiveCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
