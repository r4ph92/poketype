import { browserPollingEnvironment } from './browser-polling-environment';
import { createPollingSubscription } from './polling-room-subscription';
import type { SubscribeToRoom } from './room-subscription';

// Push delivery (#18) replaces only this binding.
export const subscribeToRoom: SubscribeToRoom = (roomId, fromRevision, subscriber) =>
  createPollingSubscription(browserPollingEnvironment())(roomId, fromRevision, subscriber);
