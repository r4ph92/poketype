import { describe, expect, it } from 'vitest';
import { readPushSettings, socketOrigin, toPublicPushConfig, type PushEnvironment } from '../../src/server/push/push-settings';

const selfHosted: PushEnvironment = {
  PUSHER_APP_ID: 'app-id',
  PUSHER_KEY: 'app-key',
  PUSHER_SECRET: 'app-secret',
  PUSHER_HOST: 'localhost',
  PUSHER_PORT: '6001',
  PUSHER_USE_TLS: 'false',
};

const pusherCluster: PushEnvironment = { PUSHER_APP_ID: 'app-id', PUSHER_KEY: 'app-key', PUSHER_SECRET: 'app-secret', PUSHER_CLUSTER: 'eu' };

function without(environment: PushEnvironment, name: string): PushEnvironment {
  return Object.fromEntries(Object.entries(environment).filter(([key]) => key !== name));
}

describe('push settings', () => {
  it('means polling only when no PUSHER_* variable is set', () => {
    expect(readPushSettings({ DATABASE_URL: 'postgres://localhost/poketype' })).toBeNull();
  });

  it('points the server and the browser at the same self-hosted Pusher-protocol server', () => {
    const settings = readPushSettings(selfHosted)!;
    expect(settings.api).toEqual({ host: 'localhost', port: 6001, useTls: false });
    expect(settings.socket).toEqual(settings.api);
    expect(socketOrigin(settings)).toBe('ws://localhost:6001');
  });

  it('uses the Pusher Channels API and websocket hosts of the cluster, over TLS', () => {
    const settings = readPushSettings(pusherCluster)!;
    expect(settings.api).toEqual({ host: 'api-eu.pusher.com', port: 443, useTls: true });
    expect(settings.socket).toEqual({ host: 'ws-eu.pusher.com', port: 443, useTls: true });
    expect(socketOrigin(settings)).toBe('wss://ws-eu.pusher.com');
  });

  it.each(['PUSHER_APP_ID', 'PUSHER_KEY', 'PUSHER_SECRET', 'PUSHER_HOST', 'PUSHER_PORT'])('fails loudly when %s is missing from a partial set', (name) => {
    expect(() => readPushSettings(without(selfHosted, name))).toThrow(name);
  });

  it('refuses a cluster and a host together, a bad port, a bad TLS flag and a cluster that is not a name', () => {
    expect(() => readPushSettings({ ...selfHosted, PUSHER_CLUSTER: 'eu' })).toThrow('not both');
    expect(() => readPushSettings({ ...selfHosted, PUSHER_PORT: '70000' })).toThrow('PUSHER_PORT');
    expect(() => readPushSettings({ ...selfHosted, PUSHER_USE_TLS: 'yes' })).toThrow('PUSHER_USE_TLS');
    expect(() => readPushSettings({ ...pusherCluster, PUSHER_CLUSTER: 'eu.evil.example/' })).toThrow('PUSHER_CLUSTER');
  });

  it('gives the browser the key and the websocket address, never the secret or the app id', () => {
    const publicConfig = toPublicPushConfig(readPushSettings(selfHosted)!);
    expect(publicConfig).toEqual({ key: 'app-key', host: 'localhost', port: 6001, useTls: false });
    expect(JSON.stringify(publicConfig)).not.toContain('app-secret');
    expect(JSON.stringify(publicConfig)).not.toContain('app-id');
  });
});
