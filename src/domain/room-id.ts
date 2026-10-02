import { isCanonicalUuid } from './uuid';

export type RoomId = string & { readonly __brand: 'RoomId' };

export function parseRoomId(value: unknown): RoomId | null {
  return isCanonicalUuid(value) ? (value as RoomId) : null;
}

export function roomPath(roomId: RoomId): string {
  return `/rooms/${roomId}`;
}

export function roomEntryPath(roomId: RoomId): string {
  return `/?room=${roomId}`;
}

export function raceResultsPath(roomId: RoomId, raceId: string): string {
  return `${roomPath(roomId)}/races/${raceId}`;
}
