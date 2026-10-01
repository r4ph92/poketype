import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPushedSubscription } from '../../src/features/rooms/live/pushed-room-subscription';
import type { ConnectRoomPush, RoomPushListener } from '../../src/features/rooms/live/room-push';
import type { Unsubscribe } from '../../src/features/rooms/live/room-subscription';
import { FakeBrowser, fakeSubscriber, keepaliveIntervalMs, raceIntervalMs, raceSnapshotAt, roomId, snapshotAt } from './support/room-polling';

class FakePush {
  isConnected = false;
  private listener: RoomPushListener | null = null;

  readonly connect: ConnectRoomPush = (_roomId, listener) => {
    this.listener = listener;
    this.isConnected = true;
    return () => {
      this.isConnected = false;
    };
  };

  setLive(isLive: boolean): void {
    this.listener!.onLiveChange(isLive);
  }

  ping(revision: number): void {
    this.listener!.onRevision(revision);
  }
}

const typingRace = (revision: number) => raceSnapshotAt(revision, [null, 9_000]);

describe('pushed room subscription', () => {
  let browser: FakeBrowser;
  let push: FakePush;
  let subscriber: ReturnType<typeof fakeSubscriber>;
  let unsubscribe: Unsubscribe;

  async function goLiveShowing(outcome = snapshotAt(5)): Promise<void> {
    push.setLive(true);
    await browser.answerLatest(outcome);
  }

  async function expectNextRequestAfter(delayMs: number): Promise<void> {
    const requestsBefore = browser.requests.length;
    await vi.advanceTimersByTimeAsync(delayMs - 1);
    expect(browser.requests).toHaveLength(requestsBefore);
    await vi.advanceTimersByTimeAsync(1);
    expect(browser.requests).toHaveLength(requestsBefore + 1);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    browser = new FakeBrowser();
    push = new FakePush();
    subscriber = fakeSubscriber();
    unsubscribe = createPushedSubscription(browser.environment, push.connect)(roomId, 5, subscriber);
  });

  afterEach(() => {
    unsubscribe();
    vi.useRealTimers();
  });

  it('catches up in one request as soon as push is live', async () => {
    push.setLive(true);
    expect(browser.requests).toHaveLength(1);
  });

  it('asks for the snapshot at once when a ping announces a newer revision', async () => {
    await goLiveShowing();
    push.ping(6);
    expect(browser.requests).toHaveLength(2);
    await browser.answerLatest(snapshotAt(6));
    expect(subscriber.onSnapshot).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ revision: 6 }));
  });

  it('ignores a ping for a revision the page already shows', async () => {
    await goLiveShowing();
    push.ping(5);
    push.ping(4);
    expect(browser.requests).toHaveLength(1);
  });

  it('never abandons the request in flight for a ping, and asks again once its answer is still behind', async () => {
    push.setLive(true);
    push.ping(7);
    expect(browser.openRequests).toHaveLength(1);
    expect(browser.requests[0]!.signal.aborted).toBe(false);
    await browser.answerLatest(snapshotAt(6));
    expect(browser.requests).toHaveLength(2);
    await browser.answerLatest(snapshotAt(7));
    expect(browser.requests).toHaveLength(2);
  });

  it('asks nothing more when the answer in flight already holds the pinged revision', async () => {
    push.setLive(true);
    push.ping(6);
    push.ping(6);
    await browser.answerLatest(snapshotAt(6));
    await expectNextRequestAfter(keepaliveIntervalMs);
  });

  it('follows a race at the keepalive pace while push is live', async () => {
    await goLiveShowing(typingRace(5));
    await expectNextRequestAfter(keepaliveIntervalMs);
  });

  it('asks at once and goes back to the race pace when push drops', async () => {
    await goLiveShowing(typingRace(5));
    push.setLive(false);
    expect(browser.requests).toHaveLength(2);
    await browser.answerLatest(typingRace(5));
    await expectNextRequestAfter(raceIntervalMs);
  });

  it('goes back to the race pace when a poll finds a change no ping announced, until push proves itself again', async () => {
    await goLiveShowing(typingRace(5));
    await vi.advanceTimersByTimeAsync(keepaliveIntervalMs);
    await browser.answerLatest(typingRace(6));
    await expectNextRequestAfter(raceIntervalMs);
    await browser.answerLatest(typingRace(6));

    push.ping(7);
    await browser.answerLatest(typingRace(7));
    await expectNextRequestAfter(keepaliveIntervalMs);
  });

  it('waits for the tab to be visible before acting on a ping', async () => {
    await goLiveShowing();
    browser.setHidden(true);
    push.ping(6);
    expect(browser.requests).toHaveLength(1);
    browser.setHidden(false);
    expect(browser.requests).toHaveLength(2);
  });

  it('unsubscribing closes the push connection and stops polling', async () => {
    await goLiveShowing();
    unsubscribe();
    expect(push.isConnected).toBe(false);
    await vi.advanceTimersByTimeAsync(5 * keepaliveIntervalMs);
    expect(browser.requests).toHaveLength(1);
  });
});
