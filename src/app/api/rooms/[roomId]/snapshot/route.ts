import { parseRoomId } from '@/domain/room-id';
import { database } from '@/server/db/client';
import { findRoomSnapshot } from '@/server/rooms/room-snapshot';
import { findCurrentGuest } from '@/server/sessions/current-guest';

type SnapshotRouteContext = { params: Promise<{ roomId: string }> };

const noStore = { 'Cache-Control': 'no-store' };

// An open room this session is not in means the session changed in another tab; the client rejoins through the link.
const refusalStatus = { 'not-member': 403, 'not-found': 404 } as const;

export async function GET(_request: Request, { params }: SnapshotRouteContext): Promise<Response> {
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = parseRoomId((await params).roomId);
  if (!roomId) return emptyResponse(404);
  const found = await findRoomSnapshot(database, roomId, guest.id);
  if (found.kind !== 'snapshot') return emptyResponse(refusalStatus[found.kind]);
  return Response.json(found.snapshot, { headers: noStore });
}

function emptyResponse(status: 401 | 403 | 404): Response {
  return new Response(null, { status, headers: noStore });
}
