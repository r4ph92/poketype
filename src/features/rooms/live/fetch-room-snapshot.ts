import type { RoomId } from '@/domain/room-id';
import { parseSnapshotResponse } from '@/domain/room-view';
import type { SnapshotFetchOutcome } from './polling-room-subscription';

const outcomeByStatus: Partial<Record<number, SnapshotFetchOutcome>> = {
  401: { kind: 'session-ended' },
  403: { kind: 'not-member' },
  404: { kind: 'gone', reason: 'closed' },
  410: { kind: 'gone', reason: 'idle' },
};

export async function fetchRoomSnapshot(roomId: RoomId, signal: AbortSignal): Promise<SnapshotFetchOutcome> {
  const response = await fetch(`/api/rooms/${roomId}/snapshot`, { cache: 'no-store', signal });
  const outcome = outcomeByStatus[response.status];
  if (outcome) return outcome;
  if (!response.ok) return { kind: 'failed' };
  const answer = parseSnapshotResponse(await response.json());
  return answer ? { kind: 'snapshot', ...answer } : { kind: 'failed' };
}
