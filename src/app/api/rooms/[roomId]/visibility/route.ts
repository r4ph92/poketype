import { gameConfig } from '@/config/game';
import { database } from '@/server/db/client';
import { emptyResponse } from '@/server/http/empty-response';
import { isJsonRequest } from '@/server/http/json-request';
import { announceRoomChange } from '@/server/push/room-publisher';
import { changeRoomVisibility, type ChangeVisibilityResult } from '@/server/rooms/change-room-visibility';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { readJsonBody, refusalOf } from '@/server/validation/read-json-body';
import { readRoomId } from '@/server/validation/read-room-id';
import { visibilityRequestSchema } from '@/server/validation/room-schemas';

type VisibilityRouteContext = { params: Promise<{ roomId: string }> };

// Choosing the visibility the room already has is not an error, so unchanged answers like a success.
const statusByResult: Record<ChangeVisibilityResult, number> = {
  changed: 200,
  unchanged: 200,
  'race-started': 409,
  'not-host': 403,
  'not-member': 403,
  'not-found': 404,
};

export async function POST(request: Request, context: VisibilityRouteContext): Promise<Response> {
  if (!isJsonRequest(request)) return emptyResponse(415);
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = await readRoomId(context);
  if (!roomId) return emptyResponse(404);
  const body = await readJsonBody(request, visibilityRequestSchema, gameConfig.rooms.maxVisibilityBodyBytes);
  if (body.kind !== 'ok') return refusalOf(body);
  const result = await changeRoomVisibility(database, { roomId, guestId: guest.id, visibility: body.value.visibility, changedAt: new Date() });
  if (result === 'changed') announceRoomChange(roomId);
  return emptyResponse(statusByResult[result]);
}
