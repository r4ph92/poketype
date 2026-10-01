import type { ChannelAuthorizationHandler } from 'pusher-js';
import { roomIdOfChannel } from '@/domain/room-channel';

// The server signs the subscription only for a member of the room, so a refusal here leaves the page on polling, which then finds out why.
export const authorizeRoomChannel: ChannelAuthorizationHandler = ({ socketId, channelName }, callback) => {
  requestChannelAuth(socketId, channelName).then(
    (auth) => callback(null, { auth }),
    (error: unknown) => callback(error instanceof Error ? error : new Error(String(error)), null),
  );
};

async function requestChannelAuth(socketId: string, channelName: string): Promise<string> {
  const roomId = roomIdOfChannel(channelName);
  if (!roomId) throw new Error(`Not a room channel: ${channelName}`);
  const response = await fetch(`/api/rooms/${roomId}/channel-auth`, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ socketId }),
  });
  if (!response.ok) throw new Error(`Channel authorization refused with ${response.status}`);
  const { auth } = (await response.json()) as { auth?: unknown };
  if (typeof auth !== 'string') throw new Error('Channel authorization answered without a signature');
  return auth;
}
