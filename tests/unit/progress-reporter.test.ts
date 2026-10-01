import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { AcceptedProgress, ParticipantProgress, ProgressReport } from '../../src/domain/progress-report';
import type { TypingCounters } from '../../src/domain/typing-progress';
import type { ReportAnswer } from '../../src/features/race/progress-answer';
import { ProgressReporter, type ReporterEnvironment, type ServerProgressListener } from '../../src/features/race/progress-reporter';

const batchMs = 250;
const retryMs = 500;
const noProgress: AcceptedProgress = { lastSequence: 0, position: 0, keystrokes: 0, rejectedKeystrokes: 0 };

type PendingReport = { report: ProgressReport; answer: (answer: ReportAnswer) => Promise<void>; fail: () => Promise<void> };

function counters(position: number, rejectedKeystrokes = 0): TypingCounters {
  return { position, keystrokes: position + rejectedKeystrokes, rejectedKeystrokes };
}

function serverRow(report: ProgressReport, finishMs: number | null = null): ParticipantProgress {
  const { sequence, ...rest } = report;
  return { lastSequence: sequence, ...rest, finishMs };
}

class FakeServer {
  readonly reports: PendingReport[] = [];

  readonly environment: ReporterEnvironment = {
    timing: { progressBatchMs: batchMs, progressRetryMs: retryMs },
    now: () => Date.now(),
    schedule: (callback, delayMs) => {
      const timer = setTimeout(callback, delayMs);
      return () => clearTimeout(timer);
    },
    send: (report) =>
      new Promise((resolve, reject) => {
        this.reports.push({
          report,
          answer: async (answer) => {
            resolve(answer);
            await vi.advanceTimersByTimeAsync(0);
          },
          fail: async () => {
            reject(new Error('network down'));
            await vi.advanceTimersByTimeAsync(0);
          },
        });
      }),
  };

  get latest(): PendingReport {
    return this.reports.at(-1)!;
  }

  async accept(finishMs: number | null = null): Promise<void> {
    await this.latest.answer({ kind: 'accepted', progress: serverRow(this.latest.report, finishMs) });
  }
}

describe('progress reporter', () => {
  let server: FakeServer;
  let onServerProgress: Mock<ServerProgressListener>;
  let reporter: ProgressReporter;

  beforeEach(() => {
    vi.useFakeTimers();
    server = new FakeServer();
    onServerProgress = vi.fn<ServerProgressListener>();
    reporter = new ProgressReporter(server.environment, noProgress, onServerProgress);
  });

  afterEach(() => {
    reporter.dispose();
    vi.useRealTimers();
  });

  it('sends the first keystroke at once with sequence 1 and the cumulative counters', () => {
    reporter.update(counters(1));
    expect(server.reports.map(({ report }) => report)).toEqual([{ sequence: 1, position: 1, keystrokes: 1, rejectedKeystrokes: 0 }]);
  });

  it('batches the keystrokes typed during the next 250 ms into one report with the next sequence', async () => {
    reporter.update(counters(1));
    await server.accept();
    reporter.update(counters(2));
    reporter.update(counters(3, 1));
    await vi.advanceTimersByTimeAsync(batchMs - 1);
    expect(server.reports).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(server.reports.map(({ report }) => report)).toEqual([
      { sequence: 1, position: 1, keystrokes: 1, rejectedKeystrokes: 0 },
      { sequence: 2, position: 3, keystrokes: 4, rejectedKeystrokes: 1 },
    ]);
  });

  it('keeps one request in flight; newer keystrokes wait for the answer', async () => {
    reporter.update(counters(1));
    reporter.update(counters(2));
    await vi.advanceTimersByTimeAsync(5 * batchMs);
    expect(server.reports).toHaveLength(1);
    await server.accept();
    expect(server.reports).toHaveLength(2);
    expect(server.latest.report).toMatchObject({ sequence: 2, position: 2 });
  });

  it('sends nothing more once the server acknowledged the latest counters', async () => {
    reporter.update(counters(1));
    await server.accept();
    await vi.advanceTimersByTimeAsync(10 * batchMs);
    expect(server.reports).toHaveLength(1);
  });

  it('retries the latest counters after a network failure, with a new sequence', async () => {
    reporter.update(counters(1));
    await server.latest.fail();
    reporter.update(counters(2));
    await vi.advanceTimersByTimeAsync(retryMs - 1);
    expect(server.reports).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(server.latest.report).toEqual({ sequence: 2, position: 2, keystrokes: 2, rejectedKeystrokes: 0 });
  });

  it('retries after a retryable answer such as a race that has not started on the server yet', async () => {
    reporter.update(counters(1));
    await server.latest.answer({ kind: 'retry' });
    await vi.advanceTimersByTimeAsync(retryMs);
    expect(server.reports).toHaveLength(2);
  });

  it('after a stale refusal, continues from the server sequence and resends what the server lacks', async () => {
    reporter.update(counters(4));
    await server.latest.answer({ kind: 'refused', progress: { lastSequence: 9, position: 2, keystrokes: 2, rejectedKeystrokes: 0, finishMs: null } });
    await vi.advanceTimersByTimeAsync(retryMs);
    expect(server.latest.report).toEqual({ sequence: 10, position: 4, keystrokes: 4, rejectedKeystrokes: 0 });
  });

  it('after an implausible refusal, keeps the local counters and retries them later', async () => {
    reporter.update(counters(30));
    await server.latest.answer({ kind: 'refused', progress: { ...noProgress, finishMs: null } });
    expect(server.reports).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(retryMs);
    expect(server.latest.report).toMatchObject({ sequence: 2, position: 30 });
  });

  it('retries the finishing report until it is accepted, then reports the server finish time and stops', async () => {
    reporter.update(counters(28));
    await server.latest.fail();
    await vi.advanceTimersByTimeAsync(retryMs);
    expect(server.latest.report).toMatchObject({ sequence: 2, position: 28 });
    await server.accept(9_400);
    expect(onServerProgress).toHaveBeenLastCalledWith(expect.objectContaining({ finishMs: 9_400 }));
    reporter.update(counters(28, 1));
    await vi.advanceTimersByTimeAsync(10 * batchMs);
    expect(server.reports).toHaveLength(2);
  });

  it('stops for good after a stopping answer', async () => {
    reporter.update(counters(1));
    await server.latest.answer({ kind: 'stop' });
    reporter.update(counters(2));
    await vi.advanceTimersByTimeAsync(10 * retryMs);
    expect(server.reports).toHaveLength(1);
  });

  it('resumes after a reload from the stored sequence and counters', () => {
    reporter.dispose();
    reporter = new ProgressReporter(server.environment, { lastSequence: 7, position: 5, keystrokes: 6, rejectedKeystrokes: 1 }, onServerProgress);
    reporter.update({ position: 5, keystrokes: 6, rejectedKeystrokes: 1 });
    expect(server.reports).toHaveLength(0);
    reporter.update({ position: 6, keystrokes: 7, rejectedKeystrokes: 1 });
    expect(server.latest.report).toEqual({ sequence: 8, position: 6, keystrokes: 7, rejectedKeystrokes: 1 });
  });

  it('a disposed reporter ignores a late answer and sends nothing', async () => {
    reporter.update(counters(1));
    reporter.update(counters(2));
    reporter.dispose();
    await server.accept();
    await vi.advanceTimersByTimeAsync(10 * batchMs);
    expect(server.reports).toHaveLength(1);
    expect(onServerProgress).not.toHaveBeenCalled();
  });
});
