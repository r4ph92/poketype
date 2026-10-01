import { parseRoomId } from '@/domain/room-id';
import { database } from '@/server/db/client';
import { emptyResponse, noStoreHeaders } from '@/server/http/empty-response';
import { isJsonRequest } from '@/server/http/json-request';
import { abandonRace, type AbandonRaceResult } from '@/server/rooms/abandon-race';
import { findCurrentGuest } from '@/server/sessions/current-guest';

type AbandonRouteContext = { params: Promise<{ roomId: string }> };

// A second click is not an error, so already-abandoned answers like a success.
const statusByResult: Record<AbandonRaceResult, number> = {
  abandoned: 200,
  'already-abandoned': 200,
  finished: 409,
  'not-racing': 409,
  'not-participant': 403,
  'not-member': 403,
  'not-found': 404,
};

export async function POST(request: Request, { params }: AbandonRouteContext): Promise<Response> {
  if (!isJsonRequest(request)) return emptyResponse(415);
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = parseRoomId((await params).roomId);
  if (!roomId) return emptyResponse(404);
  const result = await abandonRace(database, { roomId, guestId: guest.id, abandonedAt: new Date() });
  return answer(result);
}

function answer(result: AbandonRaceResult): Response {
  const status = statusByResult[result];
  if (status >= 400) return emptyResponse(status);
  return Response.json({ result }, { status, headers: noStoreHeaders });
}
