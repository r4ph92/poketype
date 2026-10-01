import { parseRoomId } from '@/domain/room-id';
import { database } from '@/server/db/client';
import { emptyResponse, noStoreHeaders } from '@/server/http/empty-response';
import { loadRoomSnapshot } from '@/server/rooms/load-room-snapshot';
import { findCurrentGuest } from '@/server/sessions/current-guest';

type SnapshotRouteContext = { params: Promise<{ roomId: string }> };

// An open room this session is not in means the session changed in another tab; the client rejoins through the link.
const refusalStatus = { 'not-member': 403, 'not-found': 404 } as const;

export async function GET(_request: Request, { params }: SnapshotRouteContext): Promise<Response> {
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = parseRoomId((await params).roomId);
  if (!roomId) return emptyResponse(404);
  const found = await loadRoomSnapshot(database, roomId, guest.id, new Date());
  if (found.kind !== 'snapshot') return emptyResponse(refusalStatus[found.kind]);
  return Response.json({ ...found.snapshot, serverNow: Date.now() }, { headers: noStoreHeaders });
}
