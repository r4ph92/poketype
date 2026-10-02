import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPollingSubscription } from '../../src/features/rooms/live/polling-room-subscription';
import type { Unsubscribe } from '../../src/features/rooms/live/room-subscription';
import {
  FakeBrowser,
  fakeSubscriber,
  intervalMs,
  raceIntervalMs,
  raceSnapshotAt,
  requestTimeoutMs,
  roomId,
  snapshotAt,
  timeoutBackoffStepMs,
} from './support/room-polling';

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
    await browser.answerLatest({ kind: 'gone', reason: 'closed' });
    expect(subscriber.onGone).toHaveBeenCalledExactlyOnceWith('closed');
    await vi.advanceTimersByTimeAsync(5 * intervalMs);
    browser.comeBackOnline();
    expect(browser.requests).toHaveLength(1);
    expect(browser.listenerCount).toBe(0);
  });

  it('reports a room closed for inactivity with its reason and stops', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs);
    await browser.answerLatest({ kind: 'gone', reason: 'idle' });
    expect(subscriber.onGone).toHaveBeenCalledExactlyOnceWith('idle');
    await vi.advanceTimersByTimeAsync(5 * intervalMs);
    expect(browser.requests).toHaveLength(1);
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

  it('reports a server time sample for every snapshot answer, even when the revision is unchanged', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs);
    const sentAt = Date.now();
    await vi.advanceTimersByTimeAsync(80);
    await browser.answerLatest(snapshotAt(5, 42_000));
    expect(subscriber.onServerTime).toHaveBeenCalledExactlyOnceWith({ serverNow: 42_000, sentAt, receivedAt: sentAt + 80 });
    await vi.advanceTimersByTimeAsync(intervalMs);
    await browser.answerLatest(snapshotAt(5));
    expect(subscriber.onServerTime).toHaveBeenCalledTimes(2);
    expect(subscriber.onSnapshot).not.toHaveBeenCalled();
  });

  it('reports no server time for a failure or a timeout', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs);
    await browser.failLatest();
    await vi.advanceTimersByTimeAsync(intervalMs + requestTimeoutMs + 1);
    await browser.answerLatest({ kind: 'failed' });
    expect(subscriber.onServerTime).not.toHaveBeenCalled();
  });

  it('polls at the race interval while a racer is still typing, even when the revision is unchanged', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs);
    await browser.answerLatest(raceSnapshotAt(5, [null, 9_000]));
    await vi.advanceTimersByTimeAsync(raceIntervalMs - 1);
    expect(browser.requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(browser.requests).toHaveLength(2);
    await browser.answerLatest(raceSnapshotAt(5, [null, 9_000]));
    await vi.advanceTimersByTimeAsync(raceIntervalMs);
    expect(browser.requests).toHaveLength(3);
  });

  it('goes back to the waiting interval once every racer has finished', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs);
    await browser.answerLatest(raceSnapshotAt(5, [null, 9_000]));
    await vi.advanceTimersByTimeAsync(raceIntervalMs);
    await browser.answerLatest(raceSnapshotAt(6, [12_000, 9_000]));
    await vi.advanceTimersByTimeAsync(intervalMs - 1);
    expect(browser.requests).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(browser.requests).toHaveLength(3);
  });

  it('asks again at the race deadline when it comes sooner than the race interval', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs);
    await browser.answerLatest(raceSnapshotAt(5, [null, 9_000], { deadlineInMs: 100 }));
    await vi.advanceTimersByTimeAsync(99);
    expect(browser.requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(browser.requests).toHaveLength(2);
  });

  it('asks again at the idle close time of a waiting room when it comes sooner than the waiting interval', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs);
    await browser.answerLatest(snapshotAt(5, Date.now(), 300));
    await vi.advanceTimersByTimeAsync(299);
    expect(browser.requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(browser.requests).toHaveLength(2);
  });

  it('keeps the race interval once the deadline has passed and the race is not settled yet', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs);
    await browser.answerLatest(raceSnapshotAt(5, [null, 9_000], { deadlineInMs: -50 }));
    await vi.advanceTimersByTimeAsync(raceIntervalMs - 1);
    expect(browser.requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(browser.requests).toHaveLength(2);
  });

  it('goes back to the waiting interval once the race settles with a racer the time limit stopped', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs);
    await browser.answerLatest(raceSnapshotAt(5, [null, 9_000], { phase: 'results', deadlineInMs: 100 }));
    await vi.advanceTimersByTimeAsync(intervalMs - 1);
    expect(browser.requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(browser.requests).toHaveLength(2);
  });

  it('keeps the race interval after a failed poll during a race', async () => {
    await vi.advanceTimersByTimeAsync(intervalMs);
    await browser.answerLatest(raceSnapshotAt(5, [null]));
    await vi.advanceTimersByTimeAsync(raceIntervalMs);
    await browser.failLatest();
    await vi.advanceTimersByTimeAsync(raceIntervalMs);
    expect(browser.requests).toHaveLength(3);
  });

  it('asks for the first snapshot at once when the first poll delay is zero', async () => {
    unsubscribe();
    const eager = new FakeBrowser();
    eager.environment.timing = { ...eager.environment.timing, firstPollDelayMs: 0 };
    unsubscribe = createPollingSubscription(eager.environment)(roomId, 5, subscriber);
    await vi.advanceTimersByTimeAsync(0);
    expect(eager.requests).toHaveLength(1);
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
