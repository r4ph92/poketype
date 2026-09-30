import { gameConfig } from '@/config/game';
import type { RoomId } from '@/domain/room-id';
import type { RoomSnapshot } from '@/domain/room-view';
import { fetchRoomSnapshot } from './fetch-room-snapshot';
import { createPollingSubscription, type PollingEnvironment } from './polling-room-subscription';

export type RoomConnection = 'live' | 'reconnecting';

export type RoomSubscriber = {
  onSnapshot: (snapshot: RoomSnapshot) => void;
  onConnectionChange: (connection: RoomConnection) => void;
  onGone: () => void;
  onSessionEnded: () => void;
};

export type Unsubscribe = () => void;

// The one boundary live room updates go through: short polling today; push delivery (#18) replaces only this binding.
export type SubscribeToRoom = (roomId: RoomId, fromRevision: number, subscriber: RoomSubscriber) => Unsubscribe;

export const subscribeToRoom: SubscribeToRoom = (roomId, fromRevision, subscriber) =>
  createPollingSubscription(browserPollingEnvironment())(roomId, fromRevision, subscriber);

function browserPollingEnvironment(): PollingEnvironment {
  return {
    intervalMs: gameConfig.roomSync.waitingPollIntervalMs,
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
