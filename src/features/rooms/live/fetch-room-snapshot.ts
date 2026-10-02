import type { RoomId } from '@/domain/room-id';
import { isRemovedAfterAbandon } from '@/domain/room-refusal';
import { parseSnapshotResponse } from '@/domain/room-view';
import type { SnapshotFetchOutcome } from './polling-room-subscription';

const outcomeByStatus: Partial<Record<number, SnapshotFetchOutcome>> = {
  401: { kind: 'session-ended' },
  404: { kind: 'gone', reason: 'closed' },
  410: { kind: 'gone', reason: 'idle' },
};

const notMember: SnapshotFetchOutcome = { kind: 'not-member' };
const removed: SnapshotFetchOutcome = { kind: 'gone', reason: 'removed' };

export async function fetchRoomSnapshot(roomId: RoomId, signal: AbortSignal): Promise<SnapshotFetchOutcome> {
  const response = await fetch(`/api/rooms/${roomId}/snapshot`, { cache: 'no-store', signal });
  if (response.status === 403) return refusalOf(response);
  const outcome = outcomeByStatus[response.status];
  if (outcome) return outcome;
  if (!response.ok) return { kind: 'failed' };
  const answer = parseSnapshotResponse(await response.json());
  return answer ? { kind: 'snapshot', ...answer } : { kind: 'failed' };
}

// A removed abandoner must never be sent to the room entry, which would seat them in the waiting room again.
async function refusalOf(response: Response): Promise<SnapshotFetchOutcome> {
  const body: unknown = await response.json().catch(() => null);
  return isRemovedAfterAbandon(body) ? removed : notMember;
}
