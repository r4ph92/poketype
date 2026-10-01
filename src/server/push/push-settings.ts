import type { PublicPushConfig } from '../../domain/push-config';

export type PushEndpoint = { host: string; port: number; useTls: boolean };

export type PushSettings = { appId: string; key: string; secret: string; api: PushEndpoint; socket: PushEndpoint };

export type PushEnvironment = Readonly<Record<string, string | undefined>>;

const pushVariableNames = ['PUSHER_APP_ID', 'PUSHER_KEY', 'PUSHER_SECRET', 'PUSHER_CLUSTER', 'PUSHER_HOST', 'PUSHER_PORT', 'PUSHER_USE_TLS'] as const;

const tlsPort = 443;

// No PUSHER_* at all means polling only; a partial set is a deployment mistake, so it fails loudly instead of silently polling.
export function readPushSettings(environment: PushEnvironment): PushSettings | null {
  if (pushVariableNames.every((name) => !environment[name])) return null;
  const credentials = { appId: required(environment, 'PUSHER_APP_ID'), key: required(environment, 'PUSHER_KEY'), secret: required(environment, 'PUSHER_SECRET') };
  return { ...credentials, ...readEndpoints(environment) };
}

function readEndpoints(environment: PushEnvironment): Pick<PushSettings, 'api' | 'socket'> {
  const cluster = environment.PUSHER_CLUSTER;
  if (cluster && environment.PUSHER_HOST) throw new Error('Set either PUSHER_CLUSTER or PUSHER_HOST, not both.');
  if (cluster) return clusterEndpoints(cluster);
  const selfHosted = { host: required(environment, 'PUSHER_HOST'), port: readPort(environment), useTls: readUseTls(environment) };
  return { api: selfHosted, socket: selfHosted };
}

function clusterEndpoints(cluster: string): Pick<PushSettings, 'api' | 'socket'> {
  if (!/^[a-z0-9-]+$/.test(cluster)) throw new Error('PUSHER_CLUSTER must be a Pusher cluster name such as eu.');
  return { api: { host: `api-${cluster}.pusher.com`, port: tlsPort, useTls: true }, socket: { host: `ws-${cluster}.pusher.com`, port: tlsPort, useTls: true } };
}

function readPort(environment: PushEnvironment): number {
  const port = Number(required(environment, 'PUSHER_PORT'));
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error('PUSHER_PORT must be a port number.');
  return port;
}

function readUseTls(environment: PushEnvironment): boolean {
  const value = environment.PUSHER_USE_TLS ?? 'false';
  if (value !== 'true' && value !== 'false') throw new Error('PUSHER_USE_TLS must be true or false.');
  return value === 'true';
}

function required(environment: PushEnvironment, name: (typeof pushVariableNames)[number]): string {
  const value = environment[name];
  if (!value) throw new Error(`${name} is not set, but other PUSHER_* variables are. Set all of them, or none for polling only.`);
  return value;
}

export function socketOrigin({ socket }: PushSettings): string {
  const scheme = socket.useTls ? 'wss' : 'ws';
  const isDefaultPort = socket.port === (socket.useTls ? tlsPort : 80);
  return `${scheme}://${socket.host}${isDefaultPort ? '' : `:${socket.port}`}`;
}

export function toPublicPushConfig({ key, socket }: PushSettings): PublicPushConfig {
  return { key, host: socket.host, port: socket.port, useTls: socket.useTls };
}
