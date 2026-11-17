import { gameConfig } from '@/config/game';
import { database } from '@/server/db/client';
import { emptyResponse, noStoreHeaders } from '@/server/http/empty-response';
import { isJsonRequest } from '@/server/http/json-request';
import { createInvitation } from '@/server/invitations/create-invitation';
import { invitationStatusByOutcome, namedInvitationRefusals } from '@/server/invitations/invitation-status';
import { announceRoomChange } from '@/server/push/room-publisher';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { readJsonBody, refusalOf } from '@/server/validation/read-json-body';
import { readRoomId } from '@/server/validation/read-room-id';
import { invitationRequestSchema } from '@/server/validation/room-schemas';

type InvitationsRouteContext = { params: Promise<{ roomId: string }> };

// The token is in this answer only: the server keeps its hash, so the host's browser is the one place the link exists.
export async function POST(request: Request, context: InvitationsRouteContext): Promise<Response> {
  if (!isJsonRequest(request)) return emptyResponse(415);
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = await readRoomId(context);
  if (!roomId) return emptyResponse(404);
  const body = await readJsonBody(request, invitationRequestSchema, gameConfig.rooms.maxInvitationBodyBytes);
  if (body.kind !== 'ok') return refusalOf(body);
  const result = await createInvitation(database, { roomId, guestId: guest.id, createdAt: new Date() });
  const status = invitationStatusByOutcome[result.outcome];
  if (result.outcome === 'created') {
    announceRoomChange(roomId);
    return Response.json({ id: result.id, token: result.token }, { status, headers: noStoreHeaders });
  }
  if (namedInvitationRefusals.has(result.outcome)) return Response.json({ result: result.outcome }, { status, headers: noStoreHeaders });
  return emptyResponse(status);
}
