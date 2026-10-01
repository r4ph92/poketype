import { gameConfig } from '@/config/game';
import { parseProgressReport, type ProgressReport } from '@/domain/progress-report';
import { parseRoomId } from '@/domain/room-id';
import { database } from '@/server/db/client';
import { emptyResponse, noStoreHeaders } from '@/server/http/empty-response';
import { isJsonRequest } from '@/server/http/json-request';
import { readCappedBody } from '@/server/http/read-capped-body';
import { reportProgress, type ReportProgressOutcome, type ReportProgressResult } from '@/server/rooms/report-progress';
import { findCurrentGuest } from '@/server/sessions/current-guest';

type ProgressRouteContext = { params: Promise<{ roomId: string }> };

const statusByResult: Record<ReportProgressResult, number> = {
  accepted: 200,
  'not-found': 404,
  'not-member': 403,
  'not-participant': 403,
  'not-started': 409,
  'race-over': 409,
  finished: 409,
  stale: 409,
  implausible: 422,
  'too-soon': 429,
};

// These answers carry the stored row so the reporter can resynchronize its sequence and counters.
const statusesWithProgress = new Set([200, 409, 422]);

export async function POST(request: Request, { params }: ProgressRouteContext): Promise<Response> {
  if (!isJsonRequest(request)) return emptyResponse(415);
  const guest = await findCurrentGuest();
  if (!guest) return emptyResponse(401);
  const roomId = parseRoomId((await params).roomId);
  if (!roomId) return emptyResponse(404);
  const body = await readCappedBody(request, gameConfig.race.maxProgressBodyBytes);
  if (body.kind === 'too-large') return emptyResponse(413);
  const report = body.kind === 'text' ? parseReport(body.text) : null;
  if (!report) return emptyResponse(400);
  return answer(await reportProgress(database, { roomId, guestId: guest.id, report, reportedAt: new Date() }));
}

function parseReport(text: string): ProgressReport | null {
  try {
    return parseProgressReport(JSON.parse(text));
  } catch {
    return null;
  }
}

function answer({ result, participant }: ReportProgressOutcome): Response {
  const status = statusByResult[result];
  if (!participant || !statusesWithProgress.has(status)) return emptyResponse(status);
  return Response.json({ result, ...participant }, { status, headers: noStoreHeaders });
}
