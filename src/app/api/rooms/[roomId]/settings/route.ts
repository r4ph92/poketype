import { gameConfig } from '@/config/game';
import { database } from '@/server/db/client';
import { emptyResponse } from '@/server/http/empty-response';
import { isJsonRequest } from '@/server/http/json-request';
import { announceRoomChange } from '@/server/push/room-publisher';
import { changeRoomTextSettings, type ChangeTextSettingsResult } from '@/server/rooms/change-room-settings';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { readJsonBody, refusalOf } from '@/server/validation/read-json-body';
import { readRoomId } from '@/server/validation/read-room-id';
import { textSettingsRequestSchema } from '@/server/validation/room-schemas';

type SettingsRouteContext = { params: Promise<{ roomId: string }> };

// Sending the settings the room already has is not an error, so unchanged answers like a success.
const statusByResult: Record<ChangeTextSettingsResult, number> = {
  changed: 200,
  unchanged: 200,
  'race-started': 409,
  'not-host': 403,
  'not-member': 403,
  'not-found': 404,
};

export async function POST(request: Request, context: SettingsRouteContext): Promise<Response> {
  if (!isJsonRequest(request)) return emptyResponse(415);
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = await readRoomId(context);
  if (!roomId) return emptyResponse(404);
  const body = await readJsonBody(request, textSettingsRequestSchema, gameConfig.rooms.maxSettingsBodyBytes);
  if (body.kind !== 'ok') return refusalOf(body);
  const result = await changeRoomTextSettings(database, { roomId, guestId: guest.id, settings: body.value, changedAt: new Date() });
  if (result === 'changed') announceRoomChange(roomId);
  return emptyResponse(statusByResult[result]);
}
