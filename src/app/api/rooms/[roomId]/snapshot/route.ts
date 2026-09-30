import { parseRoomId } from '@/domain/room-id';
import { database } from '@/server/db/client';
import { findRoomSnapshot } from '@/server/rooms/room-snapshot';
import { findCurrentGuest } from '@/server/sessions/current-guest';

type SnapshotRouteContext = { params: Promise<{ roomId: string }> };

const noStore = { 'Cache-Control': 'no-store' };

export async function GET(_request: Request, { params }: SnapshotRouteContext): Promise<Response> {
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = parseRoomId((await params).roomId);
  if (!roomId) return emptyResponse(404);
  const snapshot = await findRoomSnapshot(database, roomId, guest.id);
  if (!snapshot) return emptyResponse(404);
  return Response.json(snapshot, { headers: noStore });
}

function emptyResponse(status: 401 | 404): Response {
  return new Response(null, { status, headers: noStore });
}
