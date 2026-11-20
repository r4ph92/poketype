import { gameConfig } from '@/config/game';
import { database } from '@/server/db/client';
import { emptyResponse } from '@/server/http/empty-response';
import { isJsonRequest } from '@/server/http/json-request';
import { announceRoomChange } from '@/server/push/room-publisher';
import { changeHostRole, type ChangeHostRoleResult } from '@/server/rooms/change-host-role';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { readJsonBody, refusalOf } from '@/server/validation/read-json-body';
import { readRoomId } from '@/server/validation/read-room-id';
import { hostRoleRequestSchema } from '@/server/validation/room-schemas';

type HostRoleRouteContext = { params: Promise<{ roomId: string }> };

// Choosing the role the host already has is not an error, so unchanged answers like a success.
const statusByResult: Record<ChangeHostRoleResult, number> = {
  changed: 200,
  unchanged: 200,
  full: 409,
  'race-running': 409,
  'not-host': 403,
  'not-member': 403,
  'not-found': 404,
};

export async function POST(request: Request, context: HostRoleRouteContext): Promise<Response> {
  if (!isJsonRequest(request)) return emptyResponse(415);
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = await readRoomId(context);
  if (!roomId) return emptyResponse(404);
  const body = await readJsonBody(request, hostRoleRequestSchema, gameConfig.rooms.maxHostRoleBodyBytes);
  if (body.kind !== 'ok') return refusalOf(body);
  const result = await changeHostRole(database, { roomId, guestId: guest.id, role: body.value.role, changedAt: new Date() });
  if (result === 'changed') announceRoomChange(roomId);
  return emptyResponse(statusByResult[result]);
}
