import { parseInvitationToken } from '@/domain/invitation-token';
import { parseRoomId } from '@/domain/room-id';
import { hubDestination, type StarterDestination } from '@/domain/starter-destination';

export const findRaceIntent = 'find-race';

// What the home and log-in pages carry through their entry form, from their ?room= or ?invite= address or the form's hidden fields.
export type EntryReturn = { returnRoomId?: unknown; inviteToken?: unknown };

// Where a visitor goes once they have a trainer: the invitation they opened, the room they were invited to, or the hub.
export function entryReturnDestination({ returnRoomId, inviteToken }: EntryReturn): StarterDestination {
  const token = parseInvitationToken(inviteToken);
  if (token) return { kind: 'invite', token };
  const roomId = parseRoomId(returnRoomId);
  return roomId ? { kind: 'room', roomId } : hubDestination;
}

// The same return, as the query the log-in link keeps.
export function entryReturnQuery(destination: StarterDestination): string {
  if (destination.kind === 'invite') return `?invite=${destination.token}`;
  return destination.kind === 'room' ? `?room=${destination.roomId}` : '';
}
