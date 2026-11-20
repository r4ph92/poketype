import { invitationPath, parseInvitationToken, type InvitationToken } from './invitation-token';
import { parseRoomId, roomPath, type RoomId } from './room-id';
import { defaultHostRole, isHostRole, type HostRole } from './host-role';
import { isRoomVisibility, type RoomVisibility } from './room-visibility';

// Where a player without a starter was going: the starter screen carries it in its address and resumes it once the starter is saved.
export type StarterDestination =
  | { kind: 'hub' }
  | { kind: 'room'; roomId: RoomId }
  | { kind: 'invite'; token: InvitationToken }
  | { kind: 'find-race' }
  | { kind: 'create-room'; visibility: RoomVisibility; hostRole: HostRole };

export const hubDestination: StarterDestination = { kind: 'hub' };

export const starterScreenPath = '/play/choose-starter';

const roomPrefix = 'room:';
const invitePrefix = 'invite:';
const createRoomPrefix = 'create-room:';

export function chooseStarterPath(destination: StarterDestination): string {
  const next = encodeStarterDestination(destination);
  return next === null ? starterScreenPath : `${starterScreenPath}?next=${encodeURIComponent(next)}`;
}

export function encodeStarterDestination(destination: StarterDestination): string | null {
  if (destination.kind === 'room') return `${roomPrefix}${destination.roomId}`;
  if (destination.kind === 'invite') return `${invitePrefix}${destination.token}`;
  if (destination.kind === 'create-room') return `${createRoomPrefix}${destination.visibility}:${destination.hostRole}`;
  if (destination.kind === 'find-race') return 'find-race';
  return null;
}

// Anything unexpected falls back to the trainer hub: the value only ever chooses among these known destinations.
export function parseStarterDestination(value: unknown): StarterDestination {
  if (typeof value !== 'string') return hubDestination;
  if (value === 'find-race') return { kind: 'find-race' };
  if (value.startsWith(roomPrefix)) return roomDestination(parseRoomId(value.slice(roomPrefix.length)));
  if (value.startsWith(invitePrefix)) return inviteDestination(parseInvitationToken(value.slice(invitePrefix.length)));
  if (value.startsWith(createRoomPrefix)) return createRoomDestination(value.slice(createRoomPrefix.length));
  return hubDestination;
}

// A page can only redirect, never create a room or place the player, so the actions fall back to the hub there.
export function pathOf(destination: StarterDestination): string {
  if (destination.kind === 'room') return roomPath(destination.roomId);
  if (destination.kind === 'invite') return invitationPath(destination.token);
  return '/play';
}

function roomDestination(roomId: RoomId | null): StarterDestination {
  return roomId ? { kind: 'room', roomId } : hubDestination;
}

function inviteDestination(token: InvitationToken | null): StarterDestination {
  return token ? { kind: 'invite', token } : hubDestination;
}

// A link made before the role existed carries the visibility alone: the host races.
function createRoomDestination(value: string): StarterDestination {
  const [visibility, hostRole = defaultHostRole, ...rest] = value.split(':');
  return isRoomVisibility(visibility) && isHostRole(hostRole) && rest.length === 0 ? { kind: 'create-room', visibility, hostRole } : hubDestination;
}
