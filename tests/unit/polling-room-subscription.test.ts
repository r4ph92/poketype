import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RoomId } from '../../src/domain/room-id';
import type { RoomSnapshot } from '../../src/domain/room-view';
import {
  createPollingSubscription,
  type PollingEnvironment,
  type SnapshotFetchOutcome,
} from '../../src/features/rooms/live/polling-room-subscription';
import type { RoomSubscriber, Unsubscribe } from '../../src/features/rooms/live/room-subscription';

const roomId = '0b8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b' as RoomId;
const intervalMs = 1000;
const requestTimeoutMs = 1300;
const timeoutBackoffStepMs = 100;
const maxRequestTimeoutMs = 1500;

type PendingRequest = { signal: AbortSignal; resolve: (outcome: SnapshotFetchOutcome) => void; reject: (error: Error) => void };

function snapshotAt(revision: number): SnapshotFetchOutcome {
  const snapshot: RoomSnapshot = { roomId, phase: 'waiting', revision, members: [], race: null };
  return { kind: 'snapshot', snapshot, serverNow: Date.now() };
}

class FakeBrowser {
  hidden = false;
  readonly requests: PendingRequest[] = [];
  private readonly visibilityListeners = new Set<() => void>();
  private readonly onlineListeners = new Set<() => void>();

  readonly environment: PollingEnvironment = {
    timing: { waitingPollIntervalMs: intervalMs, requestTimeoutMs, timeoutBackoffStepMs, maxRequestTimeoutMs },
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

function fakeSubscriber() {
  return { onSnapshot: vi.fn(), onConnectionChange: vi.fn(), onGone: vi.fn(), onSessionEnded: vi.fn(), onNoLongerMember: vi.fn() } satisfies RoomSubscriber;
}

describe('polling room subscription', () => {
  let browser: FakeBrowser;
  let subscriber: ReturnType<typeof fakeSubscriber>;
  let unsubscribe: Unsubscribe;

  beforeEach(() => {
    vi.useFakeTimers();
    browser = new FakeBrowser();
    subscriber = fakeSubscriber();
    unsubscribe = createPollingSubscription(browser.environment)(roomId, 5, subscriber);
  });

  afterEach(() => {
    unsubscribe();
    vi.useRealTimers();
  });

  it('asks for a snapshot every second, one request after the other', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs - 1);
    expect(browser.requests).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(browser.requests).toHaveLength(1);
    await browser.answerLatest(snapshotAt(5));
    await vi.advanceTimersByTimeAsync(intervalMs);
    expect(browser.requests).toHaveLength(2);
  });

  it('never has two requests in flight while the server is slow', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs + 100);
    for (let tick = 0; tick < 10; tick += 1) {
      await vi.advanceTimersByTimeAsync(requestTimeoutMs / 4);
      expect(browser.openRequests).toHaveLength(1);
    }
    browser.comeBackOnline();
    expect(browser.openRequests).toHaveLength(1);
  });

  it('abandons a request lost for longer than the timeout and asks again at once, as reconnecting', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs);
    await vi.advanceTimersByTimeAsync(requestTimeoutMs - 1);
    expect(browser.requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(browser.requests[0]!.signal.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(browser.requests).toHaveLength(2);
    expect(subscriber.onConnectionChange).toHaveBeenCalledExactlyOnceWith('reconnecting');
  });

  it('after a request lost when the network returns, the newest snapshot arrives within 2 seconds', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs);
    const lostAt = Date.now();
    await vi.advanceTimersByTimeAsync(requestTimeoutMs + 1);
    await browser.answerLatest(snapshotAt(7));
    expect(subscriber.onSnapshot).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ revision: 7 }));
    expect(Date.now() - lostAt).toBeLessThan(2000);
  });

  it('an answer slower than the poll interval but faster than the timeout still updates the room', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs);
    await vi.advanceTimersByTimeAsync(1100);
    await browser.answerLatest(snapshotAt(7));
    expect(subscriber.onSnapshot).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ revision: 7 }));
    expect(subscriber.onConnectionChange).not.toHaveBeenCalled();
  });

  it('lengthens the timeout after consecutive timeouts, up to the cap', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs);
    const timedOutAfter: number[] = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      while (!browser.requests[attempt]) await vi.advanceTimersByTimeAsync(1);
      const startedAt = Date.now();
      while (!browser.requests[attempt]!.signal.aborted) await vi.advanceTimersByTimeAsync(10);
      timedOutAfter.push(Math.round((Date.now() - startedAt) / 10) * 10);
    }
    expect(timedOutAfter).toEqual([1300, 1400, 1500, 1500, 1500]);
  });

  it('goes back to the base timeout after an answer arrives', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs + requestTimeoutMs + 1);
    await vi.advanceTimersByTimeAsync(requestTimeoutMs + timeoutBackoffStepMs + 1);
    await browser.answerLatest(snapshotAt(1));
    await vi.advanceTimersByTimeAsync(intervalMs);
    const startedAt = Date.now();
    while (!browser.requests.at(-1)!.signal.aborted) await vi.advanceTimersByTimeAsync(10);
    expect(Date.now() - startedAt).toBe(requestTimeoutMs);
  });

  it('waits out the rest of the interval after a quick failure', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs);
    await vi.advanceTimersByTimeAsync(100);
    await browser.failLatest();
    await vi.advanceTimersByTimeAsync(intervalMs - 101);
    expect(browser.requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(browser.requests).toHaveLength(2);
  });

  it('delivers nothing while the room keeps the same revision', async () => {
    for (let poll = 0; poll < 5; poll += 1) {
      await vi.advanceTimersByTimeAsync(intervalMs);
      await browser.answerLatest(snapshotAt(5));
    }
    expect(browser.requests).toHaveLength(5);
    expect(subscriber.onSnapshot).not.toHaveBeenCalled();
  });

  it('notifies only snapshots newer than the last revision it knows', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs);
    await browser.answerLatest(snapshotAt(5));
    await vi.advanceTimersByTimeAsync(intervalMs);
    await browser.answerLatest(snapshotAt(4));
    expect(subscriber.onSnapshot).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(intervalMs);
    await browser.answerLatest(snapshotAt(6));
    expect(subscriber.onSnapshot).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ revision: 6 }));
  });

  it('reports reconnecting once on failures, then the newest snapshot and live on the first success', async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await vi.advanceTimersByTimeAsync(intervalMs);
      await browser.failLatest();
    }
    expect(subscriber.onConnectionChange.mock.calls).toEqual([['reconnecting']]);
    await vi.advanceTimersByTimeAsync(intervalMs);
    await browser.answerLatest(snapshotAt(9));
    expect(subscriber.onConnectionChange.mock.calls).toEqual([['reconnecting'], ['live']]);
    expect(subscriber.onSnapshot).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ revision: 9 }));
  });

  it('treats a server error as a lost connection', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs);
    await browser.answerLatest({ kind: 'failed' });
    expect(subscriber.onConnectionChange).toHaveBeenCalledExactlyOnceWith('reconnecting');
    await vi.advanceTimersByTimeAsync(intervalMs);
    expect(browser.requests).toHaveLength(2);
  });

  it('stops asking while the tab is hidden and asks right away when it is visible again', async () => {
    browser.setHidden(true);
    await vi.advanceTimersByTimeAsync(5 * intervalMs);
    expect(browser.requests).toHaveLength(0);
    browser.setHidden(false);
    expect(browser.requests).toHaveLength(1);
  });

  it('hiding the tab abandons the request in flight without reporting a lost connection', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs);
    browser.setHidden(true);
    expect(browser.requests[0]!.signal.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(5 * intervalMs);
    expect(subscriber.onConnectionChange).not.toHaveBeenCalled();
    expect(browser.requests).toHaveLength(1);
  });

  it('coming back online asks right away without reporting a lost connection', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs);
    browser.comeBackOnline();
    expect(browser.requests[0]!.signal.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(browser.requests).toHaveLength(2);
    expect(subscriber.onConnectionChange).not.toHaveBeenCalled();
  });

  it('coming back online while hidden waits for the tab to be visible', async () => {
    browser.setHidden(true);
    browser.comeBackOnline();
    expect(browser.requests).toHaveLength(0);
  });

  it('reports a room that is gone and stops', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs);
    await browser.answerLatest({ kind: 'gone' });
    expect(subscriber.onGone).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(5 * intervalMs);
    browser.comeBackOnline();
    expect(browser.requests).toHaveLength(1);
    expect(browser.listenerCount).toBe(0);
  });

  it('reports an ended session and stops', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs);
    await browser.answerLatest({ kind: 'session-ended' });
    expect(subscriber.onSessionEnded).toHaveBeenCalledOnce();
    expect(subscriber.onGone).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5 * intervalMs);
    expect(browser.requests).toHaveLength(1);
  });

  it('a refusal for a room the session is no longer in is reported as not-member and stops', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs);
    await browser.answerLatest({ kind: 'not-member' });
    expect(subscriber.onNoLongerMember).toHaveBeenCalledOnce();
    expect(subscriber.onSessionEnded).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5 * intervalMs);
    expect(browser.requests).toHaveLength(1);
  });

  it('unsubscribing clears the timer, abandons the request and removes the listeners', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs);
    unsubscribe();
    expect(browser.requests[0]!.signal.aborted).toBe(true);
    expect(browser.listenerCount).toBe(0);
    await browser.answerLatest(snapshotAt(8));
    await vi.advanceTimersByTimeAsync(5 * intervalMs);
    expect(browser.requests).toHaveLength(1);
    expect(subscriber.onSnapshot).not.toHaveBeenCalled();
  });
});
