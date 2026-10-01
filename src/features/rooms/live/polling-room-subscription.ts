import type { RoomId } from '@/domain/room-id';
import type { RoomSnapshot } from '@/domain/room-view';
import type { ServerTimeSample } from '@/domain/server-clock';
import type { RoomConnection, RoomSubscriber, SubscribeToRoom, Unsubscribe } from './room-subscription';

export type SnapshotFetchOutcome =
  | { kind: 'snapshot'; snapshot: RoomSnapshot; serverNow: number }
  | { kind: 'failed' }
  | { kind: 'gone' }
  | { kind: 'session-ended' }
  | { kind: 'not-member' };

export interface RoomSyncTiming {
  waitingPollIntervalMs: number;
  firstPollDelayMs: number;
  requestTimeoutMs: number;
  timeoutBackoffStepMs: number;
  maxRequestTimeoutMs: number;
}

export type PollingEnvironment = {
  timing: RoomSyncTiming;
  now: () => number;
  fetchSnapshot: (roomId: RoomId, signal: AbortSignal) => Promise<SnapshotFetchOutcome>;
  schedule: (callback: () => void, delayMs: number) => Unsubscribe;
  isHidden: () => boolean;
  onVisibilityChange: (listener: () => void) => Unsubscribe;
  onOnline: (listener: () => void) => Unsubscribe;
};

type RoomTarget = { roomId: RoomId; fromRevision: number };

type RequestTiming = { sentAt: number; receivedAt: number };

const failed: SnapshotFetchOutcome = { kind: 'failed' };

export function createPollingSubscription(environment: PollingEnvironment): SubscribeToRoom {
  return (roomId, fromRevision, subscriber) => new RoomPoller(environment, { roomId, fromRevision }, subscriber).start();
}

class RoomPoller {
  private lastRevision: number;
  private connection: RoomConnection = 'live';
  private cancelTimer: Unsubscribe | null = null;
  private request: AbortController | null = null;
  private consecutiveTimeouts = 0;
  private stopped = false;
  private readonly removeListeners: Unsubscribe[] = [];

  constructor(
    private readonly environment: PollingEnvironment,
    private readonly target: RoomTarget,
    private readonly subscriber: RoomSubscriber,
  ) {
    this.lastRevision = target.fromRevision;
  }

  start(): Unsubscribe {
    this.removeListeners.push(
      this.environment.onVisibilityChange(() => this.handleVisibilityChange()),
      this.environment.onOnline(() => this.pollNow()),
    );
    this.scheduleNextPoll(this.environment.timing.firstPollDelayMs);
    return () => this.stop();
  }

  private handleVisibilityChange(): void {
    if (this.environment.isHidden()) this.cancelPending();
    else this.pollNow();
  }

  private pollNow(): void {
    if (this.stopped || this.environment.isHidden()) return;
    this.cancelPending();
    void this.poll();
  }

  private scheduleNextPoll(delayMs: number): void {
    if (this.stopped || this.environment.isHidden()) return;
    this.cancelTimer = this.environment.schedule(() => {
      this.cancelTimer = null;
      void this.poll();
    }, delayMs);
  }

  // Polls start one interval apart, so a request that timed out is followed at once and a quick failure waits out the interval.
  private delayAfterRequestSentAt(sentAt: number): number {
    return Math.max(0, this.environment.timing.waitingPollIntervalMs - (this.environment.now() - sentAt));
  }

  // Cancelling here (tab hidden, back online, unsubscribe) is the poller's own choice, so it never reports a lost connection; only a timeout does.
  private cancelPending(): void {
    this.cancelTimer?.();
    this.cancelTimer = null;
    this.request?.abort();
    this.request = null;
  }

  private async poll(): Promise<void> {
    const request = new AbortController();
    this.request = request;
    const sentAt = this.environment.now();
    const cancelTimeout = this.environment.schedule(() => request.abort(), this.currentTimeoutMs());
    const outcome = await this.environment.fetchSnapshot(this.target.roomId, request.signal).catch(() => failed);
    const receivedAt = this.environment.now();
    cancelTimeout();
    if (this.request !== request) return;
    this.request = null;
    this.consecutiveTimeouts = request.signal.aborted ? this.consecutiveTimeouts + 1 : 0;
    this.handle(outcome, { sentAt, receivedAt });
  }

  // Slow but alive connections get a little longer each time, capped so a silently lost request is still replaced within 2 seconds.
  private currentTimeoutMs(): number {
    const { requestTimeoutMs, timeoutBackoffStepMs, maxRequestTimeoutMs } = this.environment.timing;
    return Math.min(maxRequestTimeoutMs, requestTimeoutMs + this.consecutiveTimeouts * timeoutBackoffStepMs);
  }

  private handle(outcome: SnapshotFetchOutcome, timing: RequestTiming): void {
    if (outcome.kind === 'gone') return this.end(() => this.subscriber.onGone());
    if (outcome.kind === 'session-ended') return this.end(() => this.subscriber.onSessionEnded());
    if (outcome.kind === 'not-member') return this.end(() => this.subscriber.onNoLongerMember());
    if (outcome.kind === 'snapshot') this.receive(outcome.snapshot, { serverNow: outcome.serverNow, ...timing });
    else this.changeConnection('reconnecting');
    this.scheduleNextPoll(this.delayAfterRequestSentAt(timing.sentAt));
  }

  private receive(snapshot: RoomSnapshot, serverTime: ServerTimeSample): void {
    this.changeConnection('live');
    this.subscriber.onServerTime(serverTime);
    if (snapshot.revision <= this.lastRevision) return;
    this.lastRevision = snapshot.revision;
    this.subscriber.onSnapshot(snapshot);
  }

  private changeConnection(connection: RoomConnection): void {
    if (connection === this.connection) return;
    this.connection = connection;
    this.subscriber.onConnectionChange(connection);
  }

  private end(notify: () => void): void {
    this.stop();
    notify();
  }

  private stop(): void {
    this.stopped = true;
    this.cancelPending();
    this.removeListeners.forEach((removeListener) => removeListener());
  }
}
