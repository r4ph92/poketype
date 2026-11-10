import { database } from '@/server/db/client';
import { emptyResponse } from '@/server/http/empty-response';
import { isJsonRequest } from '@/server/http/json-request';
import { announceRoomChange } from '@/server/push/room-publisher';
import { prepareNextRace, type PrepareNextRaceResult } from '@/server/rooms/prepare-next-race';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { readRoomId } from '@/server/validation/read-room-id';

type PrepareRouteContext = { params: Promise<{ roomId: string }> };

const statusByResult: Record<PrepareNextRaceResult, number> = {
  prepared: 200,
  'not-results': 409,
  'not-host': 403,
  'not-member': 403,
  'not-found': 404,
};

export async function POST(request: Request, context: PrepareRouteContext): Promise<Response> {
  if (!isJsonRequest(request)) return emptyResponse(415);
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = await readRoomId(context);
  if (!roomId) return emptyResponse(404);
  const result = await prepareNextRace(database, { roomId, guestId: guest.id, preparedAt: new Date() });
  if (result === 'prepared') announceRoomChange(roomId);
  return emptyResponse(statusByResult[result]);
}
