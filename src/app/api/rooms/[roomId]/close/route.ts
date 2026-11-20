import { database } from '@/server/db/client';
import { emptyResponse } from '@/server/http/empty-response';
import { isJsonRequest } from '@/server/http/json-request';
import { announceRoomChange } from '@/server/push/room-publisher';
import { closeRoom, type CloseRoomResult } from '@/server/rooms/close-room';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { readRoomId } from '@/server/validation/read-room-id';

type CloseRouteContext = { params: Promise<{ roomId: string }> };

const statusByResult: Record<CloseRoomResult, number> = {
  closed: 200,
  'not-results': 409,
  'not-host': 403,
  'not-member': 403,
  'not-found': 404,
};

export async function POST(request: Request, context: CloseRouteContext): Promise<Response> {
  if (!isJsonRequest(request)) return emptyResponse(415);
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = await readRoomId(context);
  if (!roomId) return emptyResponse(404);
  const result = await closeRoom(database, { roomId, guestId: guest.id, closedAt: new Date() });
  if (result === 'closed') announceRoomChange(roomId);
  return emptyResponse(statusByResult[result]);
}
