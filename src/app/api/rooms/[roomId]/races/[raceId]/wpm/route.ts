import { parseRaceId } from '@/domain/race';
import { database } from '@/server/db/client';
import { emptyResponse, noStoreHeaders } from '@/server/http/empty-response';
import { findPastRaceResults } from '@/server/rooms/past-race-results';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { readRoomId } from '@/server/validation/read-room-id';

type WpmRouteContext = { params: Promise<{ roomId: string; raceId: string }> };

// The live results load every racer's WPM during the race once, apart from the snapshot they poll (PERF-02).
// Like the past race's page, only the race's participants may read it; anyone else gets the same 404 as an unknown race.
export async function GET(_request: Request, context: WpmRouteContext): Promise<Response> {
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = await readRoomId(context);
  const raceId = parseRaceId((await context.params).raceId);
  if (!roomId || !raceId) return emptyResponse(404);
  const pastRace = await findPastRaceResults(database, { roomId, raceId, viewerGuestId: guest.id });
  if (!pastRace) return emptyResponse(404);
  return Response.json(pastRace.wpmTimelines, { headers: noStoreHeaders });
}
