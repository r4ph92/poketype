import { gameConfig } from '@/config/game';
import { database } from '@/server/db/client';
import { emptyResponse } from '@/server/http/empty-response';
import { isJsonRequest } from '@/server/http/json-request';
import { announceRoomChange } from '@/server/push/room-publisher';
import { changeRoomTimeLimit, type ChangeTimeLimitResult } from '@/server/rooms/room-time-limit';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { readJsonBody, refusalOf } from '@/server/validation/read-json-body';
import { readRoomId } from '@/server/validation/read-room-id';
import { timeLimitRequestSchema } from '@/server/validation/room-schemas';

type TimeLimitRouteContext = { params: Promise<{ roomId: string }> };

// Choosing the limit the room already has is not an error, so unchanged answers like a success.
const statusByResult: Record<ChangeTimeLimitResult, number> = {
  changed: 200,
  unchanged: 200,
  'race-started': 409,
  'not-host': 403,
  'not-member': 403,
  'not-found': 404,
};

export async function POST(request: Request, context: TimeLimitRouteContext): Promise<Response> {
  if (!isJsonRequest(request)) return emptyResponse(415);
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = await readRoomId(context);
  if (!roomId) return emptyResponse(404);
  const body = await readJsonBody(request, timeLimitRequestSchema, gameConfig.rooms.maxTimeLimitBodyBytes);
  if (body.kind !== 'ok') return refusalOf(body);
  const result = await changeRoomTimeLimit(database, { roomId, guestId: guest.id, timeLimitSeconds: body.value.timeLimitSeconds, changedAt: new Date() });
  if (result === 'changed') announceRoomChange(roomId);
  return emptyResponse(statusByResult[result]);
}
