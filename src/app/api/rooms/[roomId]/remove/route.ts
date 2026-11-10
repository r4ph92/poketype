import { gameConfig } from '@/config/game';
import { database } from '@/server/db/client';
import { emptyResponse } from '@/server/http/empty-response';
import { isJsonRequest } from '@/server/http/json-request';
import { announceRoomChange } from '@/server/push/room-publisher';
import { removePlayer, type RemovePlayerResult } from '@/server/rooms/remove-player';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { readJsonBody, refusalOf } from '@/server/validation/read-json-body';
import { readRoomId } from '@/server/validation/read-room-id';
import { removalRequestSchema } from '@/server/validation/room-schemas';

type RemoveRouteContext = { params: Promise<{ roomId: string }> };

// still-active: the racer typed within the last minute, so the host cannot remove them yet.
const statusByResult: Record<RemovePlayerResult, number> = {
  removed: 200,
  'marked-inactive': 200,
  'still-active': 409,
  'not-racing': 409,
  'unknown-player': 404,
  'not-host': 403,
  'not-member': 403,
  'not-found': 404,
};

const announcedResults = new Set<RemovePlayerResult>(['removed', 'marked-inactive']);

export async function POST(request: Request, context: RemoveRouteContext): Promise<Response> {
  if (!isJsonRequest(request)) return emptyResponse(415);
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = await readRoomId(context);
  if (!roomId) return emptyResponse(404);
  const body = await readJsonBody(request, removalRequestSchema, gameConfig.rooms.maxRemovalBodyBytes);
  if (body.kind !== 'ok') return refusalOf(body);
  const result = await removePlayer(database, { roomId, guestId: guest.id, memberKey: body.value.memberKey, removedAt: new Date() });
  if (announcedResults.has(result)) announceRoomChange(roomId);
  return emptyResponse(statusByResult[result]);
}
