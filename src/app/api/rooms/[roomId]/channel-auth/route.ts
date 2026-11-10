import { gameConfig } from '@/config/game';
import { roomChannelName } from '@/domain/room-channel';
import { database } from '@/server/db/client';
import { emptyResponse, noStoreHeaders } from '@/server/http/empty-response';
import { isJsonRequest } from '@/server/http/json-request';
import { pushServer } from '@/server/push/push-server';
import { findMembership } from '@/server/rooms/room-snapshot';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { channelAuthRequestSchema } from '@/server/validation/channel-auth-schemas';
import { readJsonBody, refusalOf } from '@/server/validation/read-json-body';
import { readRoomId } from '@/server/validation/read-room-id';

type ChannelAuthRouteContext = { params: Promise<{ roomId: string }> };

const refusalStatus = { 'not-member': 403, 'not-found': 404 } as const;

// The channel comes from the path, never from the body, so a member can only ever be authorized for the room it is in.
export async function POST(request: Request, context: ChannelAuthRouteContext): Promise<Response> {
  const pusher = pushServer();
  if (!pusher) return emptyResponse(404);
  if (!isJsonRequest(request)) return emptyResponse(415);
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = await readRoomId(context);
  if (!roomId) return emptyResponse(404);
  const body = await readJsonBody(request, channelAuthRequestSchema, gameConfig.push.maxChannelAuthBodyBytes);
  if (body.kind !== 'ok') return refusalOf(body);
  const membership = await findMembership(database, roomId, guest.id);
  if (membership !== 'member') return emptyResponse(refusalStatus[membership]);
  const { auth } = pusher.authorizeChannel(body.value.socketId, roomChannelName(roomId));
  return Response.json({ auth }, { headers: noStoreHeaders });
}
