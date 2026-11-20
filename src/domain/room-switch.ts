import type { RoomId } from './room-id';
import { encodeStarterDestination, type StarterDestination } from './starter-destination';

// The offer to leave the current room first (SALLE-06) carries where the player was going, the same way the starter screen does.
export const switchRoomScreenPath = '/rooms/switch';

export function switchRoomPath(destination: StarterDestination): string {
  const next = encodeStarterDestination(destination);
  return next === null ? switchRoomScreenPath : `${switchRoomScreenPath}?next=${encodeURIComponent(next)}`;
}

// Reopening the room the player is already in is no switch at all.
export function leadsToRoom(destination: StarterDestination, roomId: RoomId): boolean {
  return destination.kind === 'room' && destination.roomId === roomId;
}
