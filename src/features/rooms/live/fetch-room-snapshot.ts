import type { RoomId } from '@/domain/room-id';
import { isClosedByHost, isRemovedAfterAbandon, isRemovedByHost } from '@/domain/room-refusal';
import { parseSnapshotResponse } from '@/domain/room-view';
import type { SnapshotFetchOutcome } from './polling-room-subscription';

const outcomeByStatus: Partial<Record<number, SnapshotFetchOutcome>> = {
  401: { kind: 'session-ended' },
  404: { kind: 'gone', reason: 'closed' },
};

const closedForInactivity: SnapshotFetchOutcome = { kind: 'gone', reason: 'idle' };
const closedByHost: SnapshotFetchOutcome = { kind: 'gone', reason: 'host-closed' };
const notMember: SnapshotFetchOutcome = { kind: 'not-member' };
const removed: SnapshotFetchOutcome = { kind: 'gone', reason: 'removed' };
const removedByHost: SnapshotFetchOutcome = { kind: 'gone', reason: 'removed-by-host' };

export async function fetchRoomSnapshot(roomId: RoomId, signal: AbortSignal): Promise<SnapshotFetchOutcome> {
  const response = await fetch(`/api/rooms/${roomId}/snapshot`, { cache: 'no-store', signal });
  if (response.status === 403) return refusalOf(response);
  if (response.status === 410) return (await isHostClosure(response)) ? closedByHost : closedForInactivity;
  const outcome = outcomeByStatus[response.status];
  if (outcome) return outcome;
  if (!response.ok) return { kind: 'failed' };
  const answer = parseSnapshotResponse(await response.json());
  return answer ? { kind: 'snapshot', ...answer } : { kind: 'failed' };
}

async function isHostClosure(response: Response): Promise<boolean> {
  return isClosedByHost(await response.json().catch(() => null));
}

// A removed player must never be sent to the room entry, which would seat them in the waiting room again.
async function refusalOf(response: Response): Promise<SnapshotFetchOutcome> {
  const body: unknown = await response.json().catch(() => null);
  if (isRemovedByHost(body)) return removedByHost;
  return isRemovedAfterAbandon(body) ? removed : notMember;
}
