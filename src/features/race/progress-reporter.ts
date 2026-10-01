import type { AcceptedProgress, ParticipantProgress, ProgressReport } from '@/domain/progress-report';
import type { TypingCounters } from '@/domain/typing-progress';
import type { Unsubscribe } from '@/features/rooms/live/room-subscription';
import type { ReportAnswer } from './progress-answer';

export type ReporterTiming = { progressBatchMs: number; progressRetryMs: number };

export type ReporterEnvironment = {
  timing: ReporterTiming;
  now: () => number;
  schedule: (callback: () => void, delayMs: number) => Unsubscribe;
  send: (report: ProgressReport) => Promise<ReportAnswer>;
};

export type ServerProgressListener = (progress: ParticipantProgress) => void;

const retry: ReportAnswer = { kind: 'retry' };

// Sends the latest counters at most once per batch, one request at a time, and keeps them until the server acknowledges them.
export class ProgressReporter {
  private latest: TypingCounters;
  private acknowledged: TypingCounters;
  private lastSequence: number;
  private lastSentAt = Number.NEGATIVE_INFINITY;
  private isSending = false;
  private cancelTimer: Unsubscribe | null = null;
  private hasEnded = false;

  constructor(
    private readonly environment: ReporterEnvironment,
    resumeFrom: AcceptedProgress,
    private readonly onServerProgress: ServerProgressListener,
  ) {
    const { lastSequence, ...counters } = resumeFrom;
    this.lastSequence = lastSequence;
    this.latest = counters;
    this.acknowledged = counters;
  }

  update(counters: TypingCounters): void {
    this.latest = counters;
    this.sendWhenAllowed();
  }

  dispose(): void {
    this.hasEnded = true;
    this.cancelTimer?.();
    this.cancelTimer = null;
  }

  // Every keystroke, correct or not, raises the keystroke count, so it alone tells whether anything is left to send.
  private get hasUnacknowledgedKeystrokes(): boolean {
    return this.latest.keystrokes > this.acknowledged.keystrokes;
  }

  private sendWhenAllowed(): void {
    if (this.hasEnded || this.isSending || this.cancelTimer || !this.hasUnacknowledgedKeystrokes) return;
    const waitMs = this.lastSentAt + this.environment.timing.progressBatchMs - this.environment.now();
    if (waitMs > 0) this.wakeAfter(waitMs);
    else void this.send();
  }

  private wakeAfter(delayMs: number): void {
    this.cancelTimer = this.environment.schedule(() => {
      this.cancelTimer = null;
      this.sendWhenAllowed();
    }, delayMs);
  }

  private async send(): Promise<void> {
    this.lastSequence += 1;
    this.isSending = true;
    this.lastSentAt = this.environment.now();
    const answer = await this.environment.send({ sequence: this.lastSequence, ...this.latest }).catch(() => retry);
    this.isSending = false;
    if (!this.hasEnded) this.handle(answer);
  }

  private handle(answer: ReportAnswer): void {
    if (answer.kind === 'stop') return this.dispose();
    if (answer.kind === 'retry') return this.wakeAfter(this.environment.timing.progressRetryMs);
    this.adopt(answer.progress);
    if (answer.kind === 'refused') this.wakeAfter(this.environment.timing.progressRetryMs);
    else this.sendWhenAllowed();
  }

  // A refusal means another tab or a lost answer moved the server on; the next report continues from its sequence.
  private adopt(progress: ParticipantProgress): void {
    const { lastSequence, finishMs, ...counters } = progress;
    this.lastSequence = Math.max(this.lastSequence, lastSequence);
    this.acknowledged = counters;
    this.onServerProgress(progress);
    if (finishMs !== null) this.dispose();
  }
}
