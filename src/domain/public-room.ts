import { isAvatarSeed } from './pixel-avatar';
import { isRoomCapacity, type RoomCapacity } from './room-capacity';
import { parseRoomId, type RoomId } from './room-id';
import { isComplexityLevel, type ComplexityLevel } from './text-complexity';
import { isTextLanguage, isWordCount, type TextLanguage } from './text-settings';

export const publicRoomStates = ['waiting', 'running', 'results'] as const;

export type PublicRoomState = (typeof publicRoomStates)[number];

// A public room as the list and the placement see it; playerCount counts its bots too.
export type PublicRoom = {
  roomId: RoomId;
  hostName: string;
  hostAvatarSeed: number;
  playerCount: number;
  capacity: RoomCapacity;
  wordCount: number;
  textLanguage: TextLanguage;
  complexity: ComplexityLevel;
  state: PublicRoomState;
};

export function canJoinPublicRoom(room: PublicRoom): boolean {
  return room.state === 'waiting';
}

export function parsePublicRooms(json: unknown): PublicRoom[] | null {
  if (!isObject(json) || !Array.isArray(json.rooms)) return null;
  const rooms = json.rooms.map(parsePublicRoom);
  return rooms.every((room) => room !== null) ? rooms : null;
}

function parsePublicRoom(value: unknown): PublicRoom | null {
  if (!isObject(value)) return null;
  const roomId = parseRoomId(value.roomId);
  const { hostName, hostAvatarSeed, playerCount, capacity, wordCount, textLanguage, complexity, state } = value;
  if (!roomId || typeof hostName !== 'string' || !isAvatarSeed(hostAvatarSeed) || !isCount(playerCount) || !isRoomCapacity(capacity) || !isWordCount(wordCount)) return null;
  if (!isTextLanguage(textLanguage) || !isComplexityLevel(complexity) || !isPublicRoomState(state)) return null;
  return { roomId, hostName, hostAvatarSeed, playerCount, capacity, wordCount, textLanguage, complexity, state };
}

function isPublicRoomState(value: unknown): value is PublicRoomState {
  return publicRoomStates.some((state) => state === value);
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
