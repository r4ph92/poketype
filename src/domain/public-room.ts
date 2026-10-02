import { parseRoomId, type RoomId } from './room-id';

// A waiting room with a free seat, as the public list and the placement see it.
export type PublicRoom = { roomId: RoomId; hostName: string; playerCount: number };

export function parsePublicRooms(json: unknown): PublicRoom[] | null {
  if (!isObject(json) || !Array.isArray(json.rooms)) return null;
  const rooms = json.rooms.map(parsePublicRoom);
  return rooms.every((room) => room !== null) ? rooms : null;
}

function parsePublicRoom(value: unknown): PublicRoom | null {
  if (!isObject(value)) return null;
  const roomId = parseRoomId(value.roomId);
  const { hostName, playerCount } = value;
  if (!roomId || typeof hostName !== 'string' || !isPositiveCount(playerCount)) return null;
  return { roomId, hostName, playerCount };
}

function isPositiveCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
