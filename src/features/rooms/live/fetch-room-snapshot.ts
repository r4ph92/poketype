import type { RoomId } from '@/domain/room-id';
import { parseRoomSnapshot } from '@/domain/room-view';
import type { SnapshotFetchOutcome } from './polling-room-subscription';

const outcomeByStatus: Partial<Record<number, SnapshotFetchOutcome>> = {
  401: { kind: 'session-ended' },
  403: { kind: 'session-ended' },
  404: { kind: 'gone' },
};

export async function fetchRoomSnapshot(roomId: RoomId, signal: AbortSignal): Promise<SnapshotFetchOutcome> {
  const response = await fetch(`/api/rooms/${roomId}/snapshot`, { cache: 'no-store', signal });
  const outcome = outcomeByStatus[response.status];
  if (outcome) return outcome;
  if (!response.ok) return { kind: 'failed' };
  const snapshot = parseRoomSnapshot(await response.json());
  return snapshot ? { kind: 'snapshot', snapshot } : { kind: 'failed' };
}
