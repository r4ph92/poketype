import { gameConfig } from '@/config/game';
import { database } from '@/server/db/client';
import { emptyResponse, noStoreHeaders } from '@/server/http/empty-response';
import { isJsonRequest } from '@/server/http/json-request';
import { announceRoomChange } from '@/server/push/room-publisher';
import { reportProgress, type ReportProgressOutcome, type ReportProgressResult } from '@/server/rooms/report-progress';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { readJsonBody, refusalOf } from '@/server/validation/read-json-body';
import { readRoomId } from '@/server/validation/read-room-id';
import { progressReportRequestSchema } from '@/server/validation/race-schemas';

type ProgressRouteContext = { params: Promise<{ roomId: string }> };

const statusByResult: Record<ReportProgressResult, number> = {
  accepted: 200,
  'not-found': 404,
  'not-member': 403,
  'not-participant': 403,
  'not-started': 409,
  'race-over': 409,
  finished: 409,
  abandoned: 409,
  inactive: 409,
  stale: 409,
  implausible: 422,
  'too-soon': 429,
};

// A late report can be the one that settles the race at its deadline; when it is not, the ping repeats a revision members already have and they drop it.
const announcedResults = new Set<ReportProgressResult>(['accepted', 'race-over']);

// These answers carry the stored row so the reporter can resynchronize its sequence and counters.
const statusesWithProgress = new Set([200, 409, 422]);

export async function POST(request: Request, context: ProgressRouteContext): Promise<Response> {
  if (!isJsonRequest(request)) return emptyResponse(415);
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = await readRoomId(context);
  if (!roomId) return emptyResponse(404);
  const body = await readJsonBody(request, progressReportRequestSchema, gameConfig.race.maxProgressBodyBytes);
  if (body.kind !== 'ok') return refusalOf(body);
  const outcome = await reportProgress(database, { roomId, guestId: guest.id, report: body.value, reportedAt: new Date() });
  if (announcedResults.has(outcome.result)) announceRoomChange(roomId);
  return answer(outcome);
}

function answer({ result, participant }: ReportProgressOutcome): Response {
  const status = statusByResult[result];
  if (!participant || !statusesWithProgress.has(status)) return emptyResponse(status);
  return Response.json({ result, ...participant }, { status, headers: noStoreHeaders });
}
