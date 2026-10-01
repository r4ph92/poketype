import { gameConfig } from '@/config/game';
import { fetchRoomSnapshot } from './fetch-room-snapshot';
import type { PollingEnvironment } from './polling-room-subscription';
import type { Unsubscribe } from './room-subscription';

export function browserPollingEnvironment(): PollingEnvironment {
  return {
    timing: gameConfig.roomSync,
    now: () => performance.now(),
    fetchSnapshot: fetchRoomSnapshot,
    schedule: (callback, delayMs) => {
      const timer = window.setTimeout(callback, delayMs);
      return () => window.clearTimeout(timer);
    },
    isHidden: () => document.visibilityState === 'hidden',
    onVisibilityChange: (listener) => listen(document, 'visibilitychange', listener),
    onOnline: (listener) => listen(window, 'online', listener),
  };
}

function listen(target: EventTarget, eventName: string, listener: () => void): Unsubscribe {
  target.addEventListener(eventName, listener);
  return () => target.removeEventListener(eventName, listener);
}
