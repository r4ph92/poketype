export type RoomId = string & { readonly __brand: 'RoomId' };

const canonicalUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function parseRoomId(value: unknown): RoomId | null {
  return typeof value === 'string' && canonicalUuid.test(value) ? (value as RoomId) : null;
}

export function roomPath(roomId: RoomId): string {
  return `/rooms/${roomId}`;
}
