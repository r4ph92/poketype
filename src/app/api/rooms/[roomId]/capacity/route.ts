import { gameConfig } from '@/config/game';
import { database } from '@/server/db/client';
import { emptyResponse, noStoreHeaders } from '@/server/http/empty-response';
import { isJsonRequest } from '@/server/http/json-request';
import { announceRoomChange } from '@/server/push/room-publisher';
import { changeRoomCapacity, type ChangeCapacityResult } from '@/server/rooms/room-capacity';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { readJsonBody, refusalOf } from '@/server/validation/read-json-body';
import { readRoomId } from '@/server/validation/read-room-id';
import { capacityRequestSchema } from '@/server/validation/room-schemas';

type CapacityRouteContext = { params: Promise<{ roomId: string }> };

// Choosing the capacity the room already has is not an error, so unchanged answers like a success.
const statusByResult: Record<ChangeCapacityResult, number> = {
  changed: 200,
  unchanged: 200,
  'below-racers': 409,
  'race-started': 409,
  'not-host': 403,
  'not-member': 403,
  'not-found': 404,
};

export async function POST(request: Request, context: CapacityRouteContext): Promise<Response> {
  if (!isJsonRequest(request)) return emptyResponse(415);
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = await readRoomId(context);
  if (!roomId) return emptyResponse(404);
  const body = await readJsonBody(request, capacityRequestSchema, gameConfig.rooms.maxCapacityBodyBytes);
  if (body.kind !== 'ok') return refusalOf(body);
  const result = await changeRoomCapacity(database, { roomId, guestId: guest.id, capacity: body.value.capacity, changedAt: new Date() });
  if (result === 'changed') announceRoomChange(roomId);
  // The lobby names this refusal, so the host reads why the lower capacity was not kept.
  if (result === 'below-racers') return Response.json({ result }, { status: statusByResult[result], headers: noStoreHeaders });
  return emptyResponse(statusByResult[result]);
}
