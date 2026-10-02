import { gameConfig } from '@/config/game';
import { parseRoomId } from '@/domain/room-id';
import { database } from '@/server/db/client';
import { emptyResponse } from '@/server/http/empty-response';
import { isJsonRequest } from '@/server/http/json-request';
import { readCappedBody } from '@/server/http/read-capped-body';
import { announceRoomChange } from '@/server/push/room-publisher';
import { removePlayer, type RemovePlayerResult } from '@/server/rooms/remove-player';
import { findCurrentGuest } from '@/server/sessions/current-guest';

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

export async function POST(request: Request, { params }: RemoveRouteContext): Promise<Response> {
  if (!isJsonRequest(request)) return emptyResponse(415);
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = parseRoomId((await params).roomId);
  if (!roomId) return emptyResponse(404);
  const body = await readCappedBody(request, gameConfig.rooms.maxRemovalBodyBytes);
  if (body.kind === 'too-large') return emptyResponse(413);
  const memberKey = body.kind === 'text' ? parseMemberKey(body.text) : null;
  if (!memberKey) return emptyResponse(400);
  const result = await removePlayer(database, { roomId, guestId: guest.id, memberKey, removedAt: new Date() });
  if (announcedResults.has(result)) announceRoomChange(roomId);
  return emptyResponse(statusByResult[result]);
}

function parseMemberKey(text: string): string | null {
  try {
    const json: unknown = JSON.parse(text);
    const memberKey = typeof json === 'object' && json !== null ? (json as { memberKey?: unknown }).memberKey : null;
    return typeof memberKey === 'string' && memberKey.length > 0 ? memberKey : null;
  } catch {
    return null;
  }
}
