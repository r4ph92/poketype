import 'server-only';
import Pusher from 'pusher';
import { gameConfig } from '@/config/game';
import type { PublicPushConfig } from '@/domain/push-config';
import { readPushSettings, toPublicPushConfig, type PushSettings } from './push-settings';

let server: Pusher | null = null;

function currentSettings(): PushSettings | null {
  return readPushSettings(process.env);
}

export function pushServer(): Pusher | null {
  if (server) return server;
  const settings = currentSettings();
  if (!settings) return null;
  const { appId, key, secret, api } = settings;
  server = new Pusher({ appId, key, secret, host: api.host, port: String(api.port), useTLS: api.useTls, timeout: gameConfig.push.publishTimeoutMs });
  return server;
}

export function publicPushConfig(): PublicPushConfig | null {
  const settings = currentSettings();
  return settings ? toPublicPushConfig(settings) : null;
}
