import { database } from '@/server/db/client';
import { emptyResponse, noStoreHeaders } from '@/server/http/empty-response';
import { isJsonRequest } from '@/server/http/json-request';
import { announceRoomChange } from '@/server/push/room-publisher';
import { startRace, type StartRaceResult } from '@/server/rooms/start-race';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { readRoomId } from '@/server/validation/read-room-id';

type StartRouteContext = { params: Promise<{ roomId: string }> };

// A second click by the host is not an error, so already-started answers like a success.
const statusByResult: Record<StartRaceResult, number> = {
  started: 201,
  'already-started': 200,
  'not-enough-players': 409,
  'impossible-text': 422,
  'not-host': 403,
  'not-member': 403,
  'not-found': 404,
};

export async function POST(request: Request, context: StartRouteContext): Promise<Response> {
  if (!isJsonRequest(request)) return emptyResponse(415);
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = await readRoomId(context);
  if (!roomId) return emptyResponse(404);
  const result = await startRace(database, { roomId, guestId: guest.id, requestedAt: new Date() });
  if (result === 'started') announceRoomChange(roomId);
  return answer(result);
}

function answer(result: StartRaceResult): Response {
  const status = statusByResult[result];
  if (status >= 400) return emptyResponse(status);
  return Response.json({ result }, { status, headers: noStoreHeaders });
}
