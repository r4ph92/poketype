import { gameConfig } from '@/config/game';
import type { RoomId } from '@/domain/room-id';
import { parseRoomSnapshot } from '@/domain/room-view';
import type { SnapshotFetchOutcome } from './polling-room-subscription';

const outcomeByStatus: Partial<Record<number, SnapshotFetchOutcome>> = {
  401: { kind: 'session-ended' },
  404: { kind: 'gone' },
};

export async function fetchRoomSnapshot(roomId: RoomId, signal: AbortSignal): Promise<SnapshotFetchOutcome> {
  const timeout = AbortSignal.timeout(gameConfig.roomSync.requestTimeoutMs);
  const response = await fetch(`/api/rooms/${roomId}/snapshot`, { cache: 'no-store', signal: AbortSignal.any([signal, timeout]) });
  const outcome = outcomeByStatus[response.status];
  if (outcome) return outcome;
  if (!response.ok) return { kind: 'failed' };
  const snapshot = parseRoomSnapshot(await response.json());
  return snapshot ? { kind: 'snapshot', snapshot } : { kind: 'failed' };
}
