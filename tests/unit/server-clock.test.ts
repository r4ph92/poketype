import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServerClock } from '../../src/domain/server-clock';

const sampleWindow = 3;

describe('server clock', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('knows nothing before the first sample', () => {
    expect(ServerClock.empty(sampleWindow).serverNowAt(500)).toBeNull();
  });

  it('estimates server time from the round-trip midpoint', () => {
    const clock = ServerClock.empty(sampleWindow).withSample({ serverNow: 10_050, sentAt: 100, receivedAt: 200 });
    expect(clock.serverNowAt(150)).toBe(10_050);
    expect(clock.serverNowAt(1_150)).toBe(11_050);
  });

  it('prefers the sample with the shortest round trip in the window', () => {
    const clock = ServerClock.empty(sampleWindow)
      .withSample({ serverNow: 10_900, sentAt: 0, receivedAt: 1_000 })
      .withSample({ serverNow: 12_010, sentAt: 2_000, receivedAt: 2_020 })
      .withSample({ serverNow: 13_700, sentAt: 3_000, receivedAt: 3_600 });
    expect(clock.serverNowAt(2_010)).toBe(12_010);
  });

  it('forgets samples older than the window', () => {
    const quickButOld = ServerClock.empty(sampleWindow).withSample({ serverNow: 99_999, sentAt: 0, receivedAt: 2 });
    const renewed = [1, 2, 3].reduce(
      (clock, poll) => clock.withSample({ serverNow: 10_000 + poll * 1_000 + 50, sentAt: poll * 1_000, receivedAt: poll * 1_000 + 100 }),
      quickButOld,
    );
    expect(renewed.serverNowAt(1_050)).toBe(11_050);
  });

  it('adding a sample leaves the earlier clock unchanged', () => {
    const first = ServerClock.empty(sampleWindow).withSample({ serverNow: 10_050, sentAt: 100, receivedAt: 200 });
    first.withSample({ serverNow: 50_000, sentAt: 300, receivedAt: 301 });
    expect(first.serverNowAt(150)).toBe(10_050);
  });

  it('moving the system clock two minutes does not change the estimate', () => {
    const clock = ServerClock.empty(sampleWindow).withSample({ serverNow: 10_050, sentAt: 100, receivedAt: 200 });
    const before = clock.serverNowAt(400);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 120_000);
    expect(clock.serverNowAt(400)).toBe(before);
    vi.setSystemTime(Date.now() - 240_000);
    expect(clock.serverNowAt(400)).toBe(before);
  });
});
