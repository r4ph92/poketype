import { isBotLevel, type BotLevel } from '@/assets/bot-characters';
import { gameConfig } from '@/config/game';
import { parseRoomId } from '@/domain/room-id';
import { database } from '@/server/db/client';
import { emptyResponse } from '@/server/http/empty-response';
import { isJsonRequest } from '@/server/http/json-request';
import { readCappedBody } from '@/server/http/read-capped-body';
import { announceRoomChange } from '@/server/push/room-publisher';
import { addBot, type AddBotResult } from '@/server/rooms/room-bots';
import { findCurrentGuest } from '@/server/sessions/current-guest';

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

// Removing a bot goes through /remove with the bot's member key, like removing a player.
export async function POST(request: Request, { params }: BotsRouteContext): Promise<Response> {
  if (!isJsonRequest(request)) return emptyResponse(415);
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = parseRoomId((await params).roomId);
  if (!roomId) return emptyResponse(404);
  const body = await readCappedBody(request, gameConfig.rooms.maxBotBodyBytes);
  if (body.kind === 'too-large') return emptyResponse(413);
  const level = body.kind === 'text' ? parseLevel(body.text) : null;
  if (!level) return emptyResponse(400);
  const result = await addBot(database, { roomId, guestId: guest.id, level, addedAt: new Date() });
  if (result === 'added') announceRoomChange(roomId);
  return emptyResponse(statusByResult[result]);
}

function parseLevel(text: string): BotLevel | null {
  try {
    const json: unknown = JSON.parse(text);
    const level = typeof json === 'object' && json !== null ? (json as { level?: unknown }).level : null;
    return isBotLevel(level) ? level : null;
  } catch {
    return null;
  }
}
