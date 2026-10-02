import { gameConfig } from '@/config/game';
import { parseRoomId } from '@/domain/room-id';
import { isRoomVisibility, type RoomVisibility } from '@/domain/room-visibility';
import { database } from '@/server/db/client';
import { emptyResponse } from '@/server/http/empty-response';
import { isJsonRequest } from '@/server/http/json-request';
import { readCappedBody } from '@/server/http/read-capped-body';
import { announceRoomChange } from '@/server/push/room-publisher';
import { changeRoomVisibility, type ChangeVisibilityResult } from '@/server/rooms/change-room-visibility';
import { findCurrentGuest } from '@/server/sessions/current-guest';

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

export async function POST(request: Request, { params }: VisibilityRouteContext): Promise<Response> {
  if (!isJsonRequest(request)) return emptyResponse(415);
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = parseRoomId((await params).roomId);
  if (!roomId) return emptyResponse(404);
  const body = await readCappedBody(request, gameConfig.rooms.maxVisibilityBodyBytes);
  if (body.kind === 'too-large') return emptyResponse(413);
  const visibility = body.kind === 'text' ? parseVisibility(body.text) : null;
  if (!visibility) return emptyResponse(400);
  const result = await changeRoomVisibility(database, { roomId, guestId: guest.id, visibility, changedAt: new Date() });
  if (result === 'changed') announceRoomChange(roomId);
  return emptyResponse(statusByResult[result]);
}

function parseVisibility(text: string): RoomVisibility | null {
  try {
    const json: unknown = JSON.parse(text);
    const visibility = typeof json === 'object' && json !== null ? (json as { visibility?: unknown }).visibility : null;
    return isRoomVisibility(visibility) ? visibility : null;
  } catch {
    return null;
  }
}
