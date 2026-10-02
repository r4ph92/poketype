import { vi } from 'vitest';
import type { RoomId } from '../../../src/domain/room-id';
import type { RoomPhase } from '../../../src/domain/room-phase';
import type { RoomSnapshot } from '../../../src/domain/room-view';
import type { PollingEnvironment, SnapshotFetchOutcome } from '../../../src/features/rooms/live/polling-room-subscription';
import type { RoomSubscriber, Unsubscribe } from '../../../src/features/rooms/live/room-subscription';

export const roomId = '0b8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b' as RoomId;
export const intervalMs = 1000;
export const raceIntervalMs = 250;
export const requestTimeoutMs = 1300;
export const timeoutBackoffStepMs = 100;
export const maxRequestTimeoutMs = 1500;
export const keepaliveIntervalMs = 1000;

type PendingRequest = { signal: AbortSignal; resolve: (outcome: SnapshotFetchOutcome) => void; reject: (error: Error) => void };

export function snapshotAt(revision: number, serverNow = Date.now()): SnapshotFetchOutcome {
  const snapshot: RoomSnapshot = { roomId, phase: 'waiting', revision, members: [], race: null };
  return { kind: 'snapshot', snapshot, serverNow };
}

type RaceSnapshotOptions = { phase?: RoomPhase; deadlineInMs?: number };

export function raceSnapshotAt(revision: number, finishTimes: (number | null)[], { phase = 'countdown', deadlineInMs }: RaceSnapshotOptions = {}): SnapshotFetchOutcome {
  const members = finishTimes.map((finishMs, index) => ({
    memberKey: `member-${index}`,
    trainerName: `Racer ${index}`,
    isHost: index === 0,
    isViewer: index === 0,
    progress: { position: finishMs === null ? 3 : 28, finishMs, abandoned: false },
  }));
  const serverNow = Date.now();
  const startsAt = 1_790_000_000_000;
  const deadlineAt = deadlineInMs === undefined ? startsAt + 180_000 : serverNow + deadlineInMs;
  const race = { id: 'race-1', startsAt, deadlineAt, passage: 'Le garçon range ses crayons.', viewer: null, results: null };
  return { kind: 'snapshot', snapshot: { roomId, phase, revision, members, race }, serverNow };
}

export class FakeBrowser {
  hidden = false;
  readonly requests: PendingRequest[] = [];
  private readonly visibilityListeners = new Set<() => void>();
  private readonly onlineListeners = new Set<() => void>();

  readonly environment: PollingEnvironment = {
    timing: {
      waitingPollIntervalMs: intervalMs,
      racePollIntervalMs: raceIntervalMs,
      keepaliveWaitingPollIntervalMs: keepaliveIntervalMs,
      keepaliveRacePollIntervalMs: keepaliveIntervalMs,
      firstPollDelayMs: intervalMs,
      requestTimeoutMs,
      timeoutBackoffStepMs,
      maxRequestTimeoutMs,
    },
    now: () => Date.now(),
    fetchSnapshot: (_roomId, signal) =>
      new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')));
        this.requests.push({ signal, resolve, reject });
      }),
    schedule: (callback, delayMs) => {
      const timer = setTimeout(callback, delayMs);
      return () => clearTimeout(timer);
    },
    isHidden: () => this.hidden,
    onVisibilityChange: (listener) => this.register(this.visibilityListeners, listener),
    onOnline: (listener) => this.register(this.onlineListeners, listener),
  };

  get listenerCount(): number {
    return this.visibilityListeners.size + this.onlineListeners.size;
  }

  get openRequests(): PendingRequest[] {
    return this.requests.filter(({ signal }) => !signal.aborted);
  }

  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.visibilityListeners.forEach((listener) => listener());
  }

  comeBackOnline(): void {
    this.onlineListeners.forEach((listener) => listener());
  }

  async answerLatest(outcome: SnapshotFetchOutcome): Promise<void> {
    this.requests.at(-1)!.resolve(outcome);
    await vi.advanceTimersByTimeAsync(0);
  }

  async failLatest(): Promise<void> {
    this.requests.at(-1)!.reject(new Error('network down'));
    await vi.advanceTimersByTimeAsync(0);
  }

  private register(listeners: Set<() => void>, listener: () => void): Unsubscribe {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
}

export function fakeSubscriber() {
  return { onSnapshot: vi.fn(), onServerTime: vi.fn(), onConnectionChange: vi.fn(), onGone: vi.fn(), onSessionEnded: vi.fn(), onNoLongerMember: vi.fn() } satisfies RoomSubscriber;
}
