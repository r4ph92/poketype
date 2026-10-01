import { isRaceUnderway, type RoomSnapshot } from '@/domain/room-view';
import type { ServerTimeSample } from '@/domain/server-clock';
import { PollPace } from './poll-pace';
import type { PollingEnvironment, RoomTarget, SnapshotFetchOutcome } from './polling-room-subscription';
import type { RoomConnection, RoomSubscriber, Unsubscribe } from './room-subscription';

type RequestTiming = { sentAt: number; receivedAt: number };

const failed: SnapshotFetchOutcome = { kind: 'failed' };

export class RoomPoller {
  private lastRevision: number;
  private readonly pace: PollPace;
  private raceDeadlineLocalAt: number | null = null;
  private connection: RoomConnection = 'live';
  private cancelTimer: Unsubscribe | null = null;
  private request: AbortController | null = null;
  private isRefreshWanted = false;
  private consecutiveTimeouts = 0;
  private stopped = false;
  private readonly removeListeners: Unsubscribe[] = [];

  constructor(
    private readonly environment: PollingEnvironment,
    private readonly target: RoomTarget,
    private readonly subscriber: RoomSubscriber,
  ) {
    this.lastRevision = target.fromRevision;
    this.pace = new PollPace(environment.timing, target.fromRevision);
  }

  start(): Unsubscribe {
    this.removeListeners.push(
      this.environment.onVisibilityChange(() => this.handleVisibilityChange()),
      this.environment.onOnline(() => this.pollNow()),
    );
    this.scheduleNextPoll(this.environment.timing.firstPollDelayMs);
    return () => this.stop();
  }

  // A push hint never abandons the request in flight: it asks again once that answer is in, if it is still behind.
  refresh(): void {
    if (this.stopped || this.environment.isHidden()) return;
    if (this.request) {
      this.isRefreshWanted = true;
      return;
    }
    this.cancelPending();
    void this.poll();
  }

  notePing(revision: number): void {
    this.pace.notePing(revision);
    if (revision > this.lastRevision) this.refresh();
  }

  setPushLive(isLive: boolean): void {
    this.pace.setPushLive(isLive);
    this.refresh();
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
    if (this.takeWantedRefresh()) return 0;
    return Math.max(0, this.pace.intervalMs() - (this.environment.now() - sentAt));
  }

  private takeWantedRefresh(): boolean {
    const isWanted = this.isRefreshWanted && this.pace.isBehindPing(this.lastRevision);
    this.isRefreshWanted = false;
    return isWanted;
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
    this.scheduleNextPoll(this.nextPollDelay(timing.sentAt));
  }

  // The poll that sees the deadline passed settles the race, so a running race is also asked for at its deadline, not one interval later.
  private nextPollDelay(sentAt: number): number {
    const intervalDelay = this.delayAfterRequestSentAt(sentAt);
    if (this.raceDeadlineLocalAt === null) return intervalDelay;
    const untilDeadline = this.raceDeadlineLocalAt - this.environment.now();
    return untilDeadline > 0 ? Math.min(intervalDelay, untilDeadline) : intervalDelay;
  }

  // Every answer sets the pace, changed or not, so a race that is already underway is followed at the race interval.
  private receive(snapshot: RoomSnapshot, serverTime: ServerTimeSample): void {
    this.changeConnection('live');
    this.subscriber.onServerTime(serverTime);
    const isNewer = snapshot.revision > this.lastRevision;
    this.pace.follow(snapshot, isNewer);
    this.raceDeadlineLocalAt = localDeadlineOf(snapshot, serverTime);
    if (!isNewer) return;
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

// The server stamped its time at the latest when the answer arrived, so counting from receivedAt never asks before the deadline on the server.
function localDeadlineOf(snapshot: RoomSnapshot, { serverNow, receivedAt }: ServerTimeSample): number | null {
  if (snapshot.race === null || !isRaceUnderway(snapshot)) return null;
  return receivedAt + (snapshot.race.deadlineAt - serverNow);
}
