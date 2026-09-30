import { connect, createServer, type AddressInfo, type Server, type Socket } from 'node:net';

export type SwitchableDatabase = { url: string; setAvailable: (available: boolean) => void; close: () => Promise<void> };

const defaultPostgresPort = 5432;

function trackSocket(openSockets: Set<Socket>, socket: Socket): void {
  openSockets.add(socket);
  socket.on('close', () => openSockets.delete(socket));
  socket.on('error', () => socket.destroy());
}

function destroyAll(openSockets: Set<Socket>): void {
  openSockets.forEach((socket) => socket.destroy());
}

function relayUrlFor(targetUrl: string, port: number): string {
  const relayUrl = new URL(targetUrl);
  relayUrl.hostname = '127.0.0.1';
  relayUrl.port = String(port);
  return relayUrl.toString();
}

function pipeTo(target: URL, openSockets: Set<Socket>, client: Socket): void {
  const upstream = connect(Number(target.port || defaultPostgresPort), target.hostname);
  trackSocket(openSockets, client);
  trackSocket(openSockets, upstream);
  client.on('close', () => upstream.destroy());
  upstream.on('close', () => client.destroy());
  client.pipe(upstream).pipe(client);
}

function closeRelay(relay: Server, openSockets: Set<Socket>): Promise<void> {
  destroyAll(openSockets);
  return new Promise((resolve) => relay.close(() => resolve()));
}

export async function startSwitchableDatabase(targetUrl: string): Promise<SwitchableDatabase> {
  const target = new URL(targetUrl);
  const openSockets = new Set<Socket>();
  let available = true;

  const relay = createServer((client) => (available ? pipeTo(target, openSockets, client) : client.destroy()));
  await new Promise<void>((resolve) => relay.listen(0, '127.0.0.1', resolve));

  return {
    url: relayUrlFor(targetUrl, (relay.address() as AddressInfo).port),
    setAvailable: (next) => {
      available = next;
      if (!next) destroyAll(openSockets);
    },
    close: () => closeRelay(relay, openSockets),
  };
}
