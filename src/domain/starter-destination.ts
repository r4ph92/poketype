import { parseRoomId, roomPath, type RoomId } from './room-id';
import { isRoomVisibility, type RoomVisibility } from './room-visibility';

// Where a player without a starter was going: the starter screen carries it in its address and resumes it once the starter is saved.
export type StarterDestination =
  | { kind: 'hub' }
  | { kind: 'room'; roomId: RoomId }
  | { kind: 'find-race' }
  | { kind: 'create-room'; visibility: RoomVisibility };

export const hubDestination: StarterDestination = { kind: 'hub' };

export const starterScreenPath = '/play/choose-starter';

const roomPrefix = 'room:';
const createRoomPrefix = 'create-room:';

export function chooseStarterPath(destination: StarterDestination): string {
  const next = encodeStarterDestination(destination);
  return next === null ? starterScreenPath : `${starterScreenPath}?next=${encodeURIComponent(next)}`;
}

export function encodeStarterDestination(destination: StarterDestination): string | null {
  if (destination.kind === 'room') return `${roomPrefix}${destination.roomId}`;
  if (destination.kind === 'create-room') return `${createRoomPrefix}${destination.visibility}`;
  if (destination.kind === 'find-race') return 'find-race';
  return null;
}

// Anything unexpected falls back to the trainer hub: the value only ever chooses among these known destinations.
export function parseStarterDestination(value: unknown): StarterDestination {
  if (typeof value !== 'string') return hubDestination;
  if (value === 'find-race') return { kind: 'find-race' };
  if (value.startsWith(roomPrefix)) return roomDestination(parseRoomId(value.slice(roomPrefix.length)));
  if (value.startsWith(createRoomPrefix)) return createRoomDestination(value.slice(createRoomPrefix.length));
  return hubDestination;
}

// A page can only redirect, never create a room or place the player, so the actions fall back to the hub there.
export function pathOf(destination: StarterDestination): string {
  return destination.kind === 'room' ? roomPath(destination.roomId) : '/play';
}

function roomDestination(roomId: RoomId | null): StarterDestination {
  return roomId ? { kind: 'room', roomId } : hubDestination;
}

function createRoomDestination(visibility: string): StarterDestination {
  return isRoomVisibility(visibility) ? { kind: 'create-room', visibility } : hubDestination;
}
