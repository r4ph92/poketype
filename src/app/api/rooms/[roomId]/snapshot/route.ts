import { database } from '@/server/db/client';
import { emptyResponse, noStoreHeaders } from '@/server/http/empty-response';
import { announceRoomChange } from '@/server/push/room-publisher';
import { loadRoomSnapshot } from '@/server/rooms/load-room-snapshot';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { readRoomId } from '@/server/validation/read-room-id';
import { closedByHost, removedAfterAbandon, removedByHost } from '@/domain/room-refusal';

type SnapshotRouteContext = { params: Promise<{ roomId: string }> };

// An open room this session is not in means the session changed in another tab; the client rejoins through the link.
// A removed abandoner, or a player the host removed, gets the same 403 with a reason, so their page goes home instead of rejoining.
// 410 tells a member their room closed, so the play page can say why: for inactivity (no body) or because the host closed it.
const refusalStatus = { 'not-member': 403, 'not-found': 404, 'closed-idle': 410 } as const;
const goneStatus = 410;

export async function GET(_request: Request, context: SnapshotRouteContext): Promise<Response> {
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = await readRoomId(context);
  if (!roomId) return emptyResponse(404);
  const { found, hasChangedRoom } = await loadRoomSnapshot(database, roomId, guest.id, new Date());
  if (hasChangedRoom) announceRoomChange(roomId);
  if (found.kind === 'removed-abandoner') return Response.json(removedAfterAbandon, { status: 403, headers: noStoreHeaders });
  if (found.kind === 'removed-by-host') return Response.json(removedByHost, { status: 403, headers: noStoreHeaders });
  if (found.kind === 'closed-by-host') return Response.json(closedByHost, { status: goneStatus, headers: noStoreHeaders });
  if (found.kind !== 'snapshot') return emptyResponse(refusalStatus[found.kind]);
  return Response.json({ ...found.snapshot, serverNow: Date.now() }, { headers: noStoreHeaders });
}
