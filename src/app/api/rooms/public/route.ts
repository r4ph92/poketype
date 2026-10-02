import { gameConfig } from '@/config/game';
import { database } from '@/server/db/client';
import { emptyResponse, noStoreHeaders } from '@/server/http/empty-response';
import { findPublicRooms } from '@/server/rooms/public-rooms';
import { findCurrentGuest } from '@/server/sessions/current-guest';

export async function GET(): Promise<Response> {
  if (!(await findCurrentGuest())) return emptyResponse(401);
  const rooms = await findPublicRooms(database, gameConfig.publicRooms.listLimit, new Date());
  return Response.json({ rooms }, { headers: noStoreHeaders });
}
