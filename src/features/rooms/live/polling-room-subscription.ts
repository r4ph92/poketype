import type { RoomId } from '@/domain/room-id';
import type { RoomSnapshot } from '@/domain/room-view';
import type { RoomConnection, RoomSubscriber, SubscribeToRoom, Unsubscribe } from './room-subscription';

export type SnapshotFetchOutcome =
  | { kind: 'snapshot'; snapshot: RoomSnapshot }
  | { kind: 'failed' }
  | { kind: 'gone' }
  | { kind: 'session-ended' };

export type PollingEnvironment = {
  intervalMs: number;
  fetchSnapshot: (roomId: RoomId, signal: AbortSignal) => Promise<SnapshotFetchOutcome>;
  schedule: (callback: () => void, delayMs: number) => Unsubscribe;
  isHidden: () => boolean;
  onVisibilityChange: (listener: () => void) => Unsubscribe;
  onOnline: (listener: () => void) => Unsubscribe;
};

type RoomTarget = { roomId: RoomId; fromRevision: number };

const failed: SnapshotFetchOutcome = { kind: 'failed' };

export function createPollingSubscription(environment: PollingEnvironment): SubscribeToRoom {
  return (roomId, fromRevision, subscriber) => new RoomPoller(environment, { roomId, fromRevision }, subscriber).start();
}

class RoomPoller {
  private lastRevision: number;
  private connection: RoomConnection = 'live';
  private cancelTimer: Unsubscribe | null = null;
  private request: AbortController | null = null;
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
    this.scheduleNextPoll();
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

  private scheduleNextPoll(): void {
    if (this.stopped || this.environment.isHidden()) return;
    this.cancelTimer = this.environment.schedule(() => {
      this.cancelTimer = null;
      void this.poll();
    }, this.environment.intervalMs);
  }

  // Aborts started here (tab hidden, back online, unsubscribe) are the poller's own choice, so they never report a lost connection.
  private cancelPending(): void {
    this.cancelTimer?.();
    this.cancelTimer = null;
    this.request?.abort();
    this.request = null;
  }

  private async poll(): Promise<void> {
    const request = new AbortController();
    this.request = request;
    const outcome = await this.environment.fetchSnapshot(this.target.roomId, request.signal).catch(() => failed);
    if (request.signal.aborted || this.stopped) return;
    this.request = null;
    this.handle(outcome);
  }

  private handle(outcome: SnapshotFetchOutcome): void {
    if (outcome.kind === 'gone') return this.end(() => this.subscriber.onGone());
    if (outcome.kind === 'session-ended') return this.end(() => this.subscriber.onSessionEnded());
    if (outcome.kind === 'snapshot') this.receive(outcome.snapshot);
    else this.changeConnection('reconnecting');
    this.scheduleNextPoll();
  }

  private receive(snapshot: RoomSnapshot): void {
    this.changeConnection('live');
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
