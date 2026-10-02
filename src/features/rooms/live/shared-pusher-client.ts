import type Pusher from 'pusher-js';
import { gameConfig } from '@/config/game';
import type { PublicPushConfig } from '@/domain/push-config';
import { authorizeRoomChannel } from './authorize-room-channel';

type SharedClient = { client: Promise<Pusher>; users: number; cancelRelease: (() => void) | null };

let shared: SharedClient | null = null;

// One socket per tab: a room effect that re-runs (StrictMode, a refreshed page) reuses it instead of reconnecting.
export function acquirePusher(config: PublicPushConfig): Promise<Pusher> {
  shared ??= { client: createClient(config), users: 0, cancelRelease: null };
  shared.users += 1;
  shared.cancelRelease?.();
  shared.cancelRelease = null;
  return shared.client;
}

export function releasePusher(): void {
  if (!shared) return;
  shared.users -= 1;
  if (shared.users > 0) return;
  const timer = window.setTimeout(disconnectShared, gameConfig.push.clientReleaseDelayMs);
  shared.cancelRelease = () => window.clearTimeout(timer);
}

function disconnectShared(): void {
  const client = shared?.client;
  shared = null;
  client?.then((pusher) => pusher.disconnect()).catch(() => undefined);
}

// Loaded on demand so the socket library stays out of the server render and of pages without a room.
async function createClient({ key, host, port, useTls }: PublicPushConfig): Promise<Pusher> {
  const { default: PusherClient } = await import('pusher-js');
  return new PusherClient(key, {
    cluster: '',
    wsHost: host,
    wsPort: port,
    wssPort: port,
    forceTLS: useTls,
    enabledTransports: ['ws', 'wss'],
    activityTimeout: gameConfig.push.socketActivityTimeoutMs,
    pongTimeout: gameConfig.push.socketPongTimeoutMs,
    channelAuthorization: { customHandler: authorizeRoomChannel },
  });
}
