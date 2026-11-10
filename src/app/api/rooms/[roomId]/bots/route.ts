import { gameConfig } from '@/config/game';
import { database } from '@/server/db/client';
import { emptyResponse, noStoreHeaders } from '@/server/http/empty-response';
import { isJsonRequest } from '@/server/http/json-request';
import { announceRoomChange } from '@/server/push/room-publisher';
import { addBot, type AddBotResult } from '@/server/rooms/room-bots';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { readJsonBody, refusalOf } from '@/server/validation/read-json-body';
import { readRoomId } from '@/server/validation/read-room-id';
import { botRequestSchema } from '@/server/validation/room-schemas';

type BotsRouteContext = { params: Promise<{ roomId: string }> };

const statusByResult: Record<AddBotResult, number> = {
  added: 201,
  'level-full': 409,
  full: 409,
  'race-started': 409,
  'not-host': 403,
  'not-member': 403,
  'not-found': 404,
};

// The two seat refusals name themselves, so the lobby can say whether the level or the room is full.
const namedRefusals = new Set<AddBotResult>(['level-full', 'full']);

// Removing a bot goes through /remove with the bot's member key, like removing a player.
export async function POST(request: Request, context: BotsRouteContext): Promise<Response> {
  if (!isJsonRequest(request)) return emptyResponse(415);
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = await readRoomId(context);
  if (!roomId) return emptyResponse(404);
  const body = await readJsonBody(request, botRequestSchema, gameConfig.rooms.maxBotBodyBytes);
  if (body.kind !== 'ok') return refusalOf(body);
  const result = await addBot(database, { roomId, guestId: guest.id, level: body.value.level, addedAt: new Date() });
  if (result === 'added') announceRoomChange(roomId);
  if (namedRefusals.has(result)) return Response.json({ result }, { status: statusByResult[result], headers: noStoreHeaders });
  return emptyResponse(statusByResult[result]);
}
