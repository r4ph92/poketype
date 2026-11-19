import { gameConfig } from '@/config/game';
import { database } from '@/server/db/client';
import { emptyResponse, noStoreHeaders } from '@/server/http/empty-response';
import { findPublicRoomList } from '@/server/rooms/public-rooms';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { parsePublicRoomFilter } from '@/server/validation/public-room-filter-schema';

export async function GET(request: Request): Promise<Response> {
  if (!(await findCurrentGuest())) return emptyResponse(401);
  const filter = parsePublicRoomFilter(Object.fromEntries(new URL(request.url).searchParams));
  const rooms = await findPublicRoomList(database, gameConfig.publicRooms.listLimit, new Date(), filter);
  return Response.json({ rooms }, { headers: noStoreHeaders });
}
