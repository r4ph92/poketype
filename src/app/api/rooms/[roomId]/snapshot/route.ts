import { parseRoomId, type RoomId } from '@/domain/room-id';
import { database } from '@/server/db/client';
import { isRoomOpen } from '@/domain/room-phase';
import { findRoomPhase, findRoomSnapshot } from '@/server/rooms/room-snapshot';
import { findCurrentGuest } from '@/server/sessions/current-guest';

type SnapshotRouteContext = { params: Promise<{ roomId: string }> };

const noStore = { 'Cache-Control': 'no-store' };

export async function GET(_request: Request, { params }: SnapshotRouteContext): Promise<Response> {
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = parseRoomId((await params).roomId);
  if (!roomId) return emptyResponse(404);
  const snapshot = await findRoomSnapshot(database, roomId, guest.id);
  if (!snapshot) return emptyResponse(await refusalStatus(roomId));
  return Response.json(snapshot, { headers: noStore });
}

// An open room this session is not in means the session changed in another tab; the client rejoins through the link.
async function refusalStatus(roomId: RoomId): Promise<403 | 404> {
  return isRoomOpen(await findRoomPhase(database, roomId)) ? 403 : 404;
}

function emptyResponse(status: 401 | 403 | 404): Response {
  return new Response(null, { status, headers: noStore });
}
