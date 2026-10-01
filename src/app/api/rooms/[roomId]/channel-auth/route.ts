import { gameConfig } from '@/config/game';
import { roomChannelName } from '@/domain/room-channel';
import { parseRoomId } from '@/domain/room-id';
import { database } from '@/server/db/client';
import { emptyResponse, noStoreHeaders } from '@/server/http/empty-response';
import { isJsonRequest } from '@/server/http/json-request';
import { readCappedBody } from '@/server/http/read-capped-body';
import { pushServer } from '@/server/push/push-server';
import { findMembership } from '@/server/rooms/room-snapshot';
import { findCurrentGuest } from '@/server/sessions/current-guest';

type ChannelAuthRouteContext = { params: Promise<{ roomId: string }> };

type SocketIdBody = { kind: 'socket-id'; socketId: string } | { kind: 'refused'; status: 400 | 413 };

const pusherSocketId = /^\d{1,20}\.\d{1,20}$/;

const refusalStatus = { 'not-member': 403, 'not-found': 404 } as const;

// The channel comes from the path, never from the body, so a member can only ever be authorized for the room it is in.
export async function POST(request: Request, { params }: ChannelAuthRouteContext): Promise<Response> {
  const pusher = pushServer();
  if (!pusher) return emptyResponse(404);
  if (!isJsonRequest(request)) return emptyResponse(415);
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = parseRoomId((await params).roomId);
  if (!roomId) return emptyResponse(404);
  const body = await readSocketIdBody(request);
  if (body.kind === 'refused') return emptyResponse(body.status);
  const membership = await findMembership(database, roomId, guest.id);
  if (membership !== 'member') return emptyResponse(refusalStatus[membership]);
  const { auth } = pusher.authorizeChannel(body.socketId, roomChannelName(roomId));
  return Response.json({ auth }, { headers: noStoreHeaders });
}

async function readSocketIdBody(request: Request): Promise<SocketIdBody> {
  const body = await readCappedBody(request, gameConfig.push.maxChannelAuthBodyBytes);
  if (body.kind === 'too-large') return { kind: 'refused', status: 413 };
  const socketId = body.kind === 'text' ? parseSocketId(body.text) : null;
  return socketId ? { kind: 'socket-id', socketId } : { kind: 'refused', status: 400 };
}

function parseSocketId(text: string): string | null {
  try {
    const { socketId } = JSON.parse(text) as { socketId?: unknown };
    return typeof socketId === 'string' && pusherSocketId.test(socketId) ? socketId : null;
  } catch {
    return null;
  }
}
