import { parseRoomId } from '@/domain/room-id';
import { database } from '@/server/db/client';
import { emptyResponse, noStoreHeaders } from '@/server/http/empty-response';
import { isJsonRequest } from '@/server/http/json-request';
import { leaveRoom, type LeaveRoomResult } from '@/server/rooms/leave-room';
import { findCurrentGuest } from '@/server/sessions/current-guest';

type LeaveRouteContext = { params: Promise<{ roomId: string }> };

const statusByResult: Record<LeaveRoomResult, number> = {
  left: 200,
  closed: 200,
  'not-member': 403,
  'not-found': 404,
};

export async function POST(request: Request, { params }: LeaveRouteContext): Promise<Response> {
  if (!isJsonRequest(request)) return emptyResponse(415);
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = parseRoomId((await params).roomId);
  if (!roomId) return emptyResponse(404);
  const result = await leaveRoom(database, { roomId, guestId: guest.id, leftAt: new Date() });
  return answer(result);
}

function answer(result: LeaveRoomResult): Response {
  const status = statusByResult[result];
  if (status >= 400) return emptyResponse(status);
  return Response.json({ result }, { status, headers: noStoreHeaders });
}
