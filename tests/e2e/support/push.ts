import { expect, type APIResponse, type BrowserContext, type Page, type WebSocket as PageSocket, type WebSocketRoute } from '@playwright/test';
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
  recordPageFramesInto(page, frames);
  return frames;
}

function recordPageFramesInto(page: Page, frames: PushFrame[]): void {
  page.on('websocket', (socket: PageSocket) => {
    if (!pushSocketUrl().test(socket.url())) return;
    socket.on('framereceived', ({ payload }) => frames.push(parseFrame(String(payload))));
  });
}

export function revisionPingsIn(frames: PushFrame[], roomId: string): number[] {
  return frames.filter((frame) => frame.event === 'revision' && frame.channel === roomChannel(roomId)).map((frame) => (frame.data as { revision: number }).revision);
}

export function isSubscribed(frames: PushFrame[], roomId: string): boolean {
  return frames.some((frame) => frame.event === 'pusher_internal:subscription_succeeded' && frame.channel === roomChannel(roomId));
}

export function recordContextFrames(context: BrowserContext): PushFrame[] {
  const frames: PushFrame[] = [];
  context.on('page', (page) => recordPageFramesInto(page, frames));
  return frames;
}

export function subscriptionCount(frames: PushFrame[], roomId: string): number {
  return frames.filter((frame) => frame.event === 'pusher_internal:subscription_succeeded' && frame.channel === roomChannel(roomId)).length;
}

// Cuts the page's live connection to Soketi and refuses new ones until restored, as a dropped network would.
export class PushSocketCutter {
  private isCut = false;
  private open: WebSocketRoute[] = [];

  static async install(context: BrowserContext): Promise<PushSocketCutter> {
    const cutter = new PushSocketCutter();
    await context.routeWebSocket(pushSocketUrl(), (socket) => cutter.route(socket));
    return cutter;
  }

  async cut(): Promise<void> {
    this.isCut = true;
    await Promise.all(this.open.map((socket) => socket.close()));
    this.open = [];
  }

  restore(): void {
    this.isCut = false;
  }

  private route(socket: WebSocketRoute): void {
    if (this.isCut) {
      void socket.close();
      return;
    }
    socket.connectToServer();
    this.open.push(socket);
  }
}

function pushSocketUrl(): RegExp {
  return new RegExp(`:${testPushSettings().socket.port}/app/`);
}
