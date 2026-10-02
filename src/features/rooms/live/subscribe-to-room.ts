import type { PublicPushConfig } from '@/domain/push-config';
import { browserPollingEnvironment } from './browser-polling-environment';
import { createPollingSubscription } from './polling-room-subscription';
import { createPushedSubscription } from './pushed-room-subscription';
import { pusherRoomPush } from './pusher-room-push';
import type { SubscribeToRoom } from './room-subscription';

// Without push settings (local runs without Soketi), the room is followed by polling alone.
export function subscribeToRoom(pushConfig: PublicPushConfig | null): SubscribeToRoom {
  const environment = browserPollingEnvironment();
  return pushConfig ? createPushedSubscription(environment, pusherRoomPush(pushConfig)) : createPollingSubscription(environment);
}
