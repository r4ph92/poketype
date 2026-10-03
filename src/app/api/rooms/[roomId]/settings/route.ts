import { gameConfig } from '@/config/game';
import { parseRoomId } from '@/domain/room-id';
import { parseTextSettings, type TextSettings } from '@/domain/text-settings';
import { database } from '@/server/db/client';
import { emptyResponse } from '@/server/http/empty-response';
import { isJsonRequest } from '@/server/http/json-request';
import { readCappedBody } from '@/server/http/read-capped-body';
import { announceRoomChange } from '@/server/push/room-publisher';
import { changeRoomTextSettings, type ChangeTextSettingsResult } from '@/server/rooms/change-room-settings';
import { findCurrentGuest } from '@/server/sessions/current-guest';

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

export async function POST(request: Request, { params }: SettingsRouteContext): Promise<Response> {
  if (!isJsonRequest(request)) return emptyResponse(415);
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = parseRoomId((await params).roomId);
  if (!roomId) return emptyResponse(404);
  const body = await readCappedBody(request, gameConfig.rooms.maxSettingsBodyBytes);
  if (body.kind === 'too-large') return emptyResponse(413);
  const settings = body.kind === 'text' ? parseSettings(body.text) : null;
  if (!settings) return emptyResponse(400);
  const result = await changeRoomTextSettings(database, { roomId, guestId: guest.id, settings, changedAt: new Date() });
  if (result === 'changed') announceRoomChange(roomId);
  return emptyResponse(statusByResult[result]);
}

function parseSettings(text: string): TextSettings | null {
  try {
    return parseTextSettings(JSON.parse(text));
  } catch {
    return null;
  }
}
