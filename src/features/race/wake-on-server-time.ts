import type { ServerClock } from '@/domain/server-clock';

export type NextChangeDelay = (serverNow: number) => number | null;

// Wakes the view each time the shown value changes on the server clock; null from nextChangeMs means nothing changes any more.
export function wakeAtEachChange(clock: ServerClock, nextChangeMs: NextChangeDelay, notify: () => void): () => void {
  let timer: number | undefined;
  const scheduleNextWakeUp = () => {
    const serverNow = clock.serverNowAt(performance.now());
    const delayMs = serverNow === null ? null : nextChangeMs(serverNow);
    if (delayMs === null) return;
    timer = window.setTimeout(() => {
      notify();
      scheduleNextWakeUp();
    }, delayMs);
  };
  scheduleNextWakeUp();
  return () => window.clearTimeout(timer);
}
