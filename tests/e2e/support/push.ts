import { expect, type APIResponse, type Page, type WebSocket as PageSocket } from '@playwright/test';
import { readPushSettings, type PushSettings } from '../../../src/server/push/push-settings';

export type PushFrame = { event: string; channel?: string; data?: unknown };

export function testPushSettings(): PushSettings {
  const settings = readPushSettings(process.env);
  if (!settings) throw new Error('The push specs need PUSHER_* (Soketi from docker-compose.yml).');
  return settings;
}

export function roomChannel(roomId: string): string {
  return `private-room-${roomId}`;
}

export function channelAuthPath(roomId: string): string {
  return `/api/rooms/${roomId}/channel-auth`;
}

export function postChannelAuth(page: Page, roomId: string, body: unknown, headers: Record<string, string> = {}): Promise<APIResponse> {
  const origin = new URL(page.url()).origin;
  return page.request.post(channelAuthPath(roomId), { headers: { origin, 'content-type': 'application/json', ...headers }, data: JSON.stringify(body) });
}

function parseFrame(raw: string): PushFrame {
  const frame = JSON.parse(raw) as PushFrame;
  return { ...frame, data: typeof frame.data === 'string' ? JSON.parse(frame.data) : frame.data };
}

// Speaks the Pusher protocol straight to Soketi from Node, the way an attacker's script would, without the app's client code.
export class RawPushSocket {
  readonly frames: PushFrame[] = [];
  socketId = '';

  private constructor(private readonly socket: WebSocket) {
    socket.addEventListener('message', (message) => this.frames.push(parseFrame(String(message.data))));
  }

  static async open(): Promise<RawPushSocket> {
    const { key, socket } = testPushSettings();
    const scheme = socket.useTls ? 'wss' : 'ws';
    const raw = new RawPushSocket(new WebSocket(`${scheme}://${socket.host}:${socket.port}/app/${key}?protocol=7&client=e2e&version=1.0`));
    const established = await raw.waitFor((frame) => frame.event === 'pusher:connection_established');
    raw.socketId = (established.data as { socket_id: string }).socket_id;
    return raw;
  }

  send(frame: PushFrame): void {
    this.socket.send(JSON.stringify(frame));
  }

  async subscribe(channel: string, auth: string): Promise<PushFrame> {
    const answersFrom = this.frames.length;
    this.send({ event: 'pusher:subscribe', data: { channel, auth } });
    return this.waitFor((frame) => frame.channel === channel || frame.event === 'pusher:subscription_error' || frame.event === 'pusher:error', answersFrom);
  }

  async waitFor(matches: (frame: PushFrame) => boolean, fromIndex = 0): Promise<PushFrame> {
    const find = () => this.frames.slice(fromIndex).find(matches);
    await expect.poll(() => find() !== undefined, { timeout: 5_000 }).toBe(true);
    return find()!;
  }

  eventsOn(channel: string): PushFrame[] {
    return this.frames.filter((frame) => frame.channel === channel && !frame.event.startsWith('pusher'));
  }

  close(): void {
    this.socket.close();
  }
}

// Records what the page's own socket receives, read from the browser's network layer rather than from app code.
export function recordPageFrames(page: Page): PushFrame[] {
  const frames: PushFrame[] = [];
  const port = String(testPushSettings().socket.port);
  page.on('websocket', (socket: PageSocket) => {
    if (!socket.url().includes(`:${port}/app/`)) return;
    socket.on('framereceived', ({ payload }) => frames.push(parseFrame(String(payload))));
  });
  return frames;
}

export function revisionPingsIn(frames: PushFrame[], roomId: string): number[] {
  return frames.filter((frame) => frame.event === 'revision' && frame.channel === roomChannel(roomId)).map((frame) => (frame.data as { revision: number }).revision);
}

export function isSubscribed(frames: PushFrame[], roomId: string): boolean {
  return frames.some((frame) => frame.event === 'pusher_internal:subscription_succeeded' && frame.channel === roomChannel(roomId));
}
