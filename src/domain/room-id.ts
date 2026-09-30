export type RoomId = string;

const canonicalUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isWellFormedRoomId(value: string): value is RoomId {
  return canonicalUuid.test(value);
}
