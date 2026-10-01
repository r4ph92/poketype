import type { RoomId } from '@/domain/room-id';
import type { RoomSnapshot } from '@/domain/room-view';
import type { PaceTiming } from './poll-pace';
import { RoomPoller } from './room-poller';
import type { SubscribeToRoom, Unsubscribe } from './room-subscription';

export type SnapshotFetchOutcome =
  | { kind: 'snapshot'; snapshot: RoomSnapshot; serverNow: number }
  | { kind: 'failed' }
  | { kind: 'gone' }
  | { kind: 'session-ended' }
  | { kind: 'not-member' };

export type RoomSyncTiming = PaceTiming & {
  firstPollDelayMs: number;
  requestTimeoutMs: number;
  timeoutBackoffStepMs: number;
  maxRequestTimeoutMs: number;
};

export type PollingEnvironment = {
  timing: RoomSyncTiming;
  now: () => number;
  fetchSnapshot: (roomId: RoomId, signal: AbortSignal) => Promise<SnapshotFetchOutcome>;
  schedule: (callback: () => void, delayMs: number) => Unsubscribe;
  isHidden: () => boolean;
  onVisibilityChange: (listener: () => void) => Unsubscribe;
  onOnline: (listener: () => void) => Unsubscribe;
};

export type RoomTarget = { roomId: RoomId; fromRevision: number };

export function createPollingSubscription(environment: PollingEnvironment): SubscribeToRoom {
  return (roomId, fromRevision, subscriber) => new RoomPoller(environment, { roomId, fromRevision }, subscriber).start();
}
