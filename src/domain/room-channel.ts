import { parseRoomId, type RoomId } from './room-id';

// The ping carries only the new revision: each member refetches its own member-gated snapshot, so the channel never holds room data.
export type RevisionPing = { revision: number };

export const revisionEvent = 'revision';

const channelPrefix = 'private-room-';

export function roomChannelName(roomId: RoomId): string {
  return `${channelPrefix}${roomId}`;
}

export function roomIdOfChannel(channelName: string): RoomId | null {
  return channelName.startsWith(channelPrefix) ? parseRoomId(channelName.slice(channelPrefix.length)) : null;
}

export function revisionPing(revision: number): RevisionPing {
  return { revision };
}

export function parseRevisionPing(data: unknown): number | null {
  if (typeof data !== 'object' || data === null) return null;
  const { revision } = data as Partial<RevisionPing>;
  return Number.isSafeInteger(revision) ? (revision as number) : null;
}
