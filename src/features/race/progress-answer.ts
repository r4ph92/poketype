import { parseParticipantProgress, type ParticipantProgress } from '@/domain/progress-report';

// accepted and refused carry the server's row; retry keeps the report for later; stop means no report can ever be accepted again.
export type ReportAnswer =
  | { kind: 'accepted'; progress: ParticipantProgress }
  | { kind: 'refused'; progress: ParticipantProgress }
  | { kind: 'retry' }
  | { kind: 'stop' };

const retry: ReportAnswer = { kind: 'retry' };
const stop: ReportAnswer = { kind: 'stop' };

const stoppingStatuses = new Set([400, 401, 403, 404, 413, 415]);

export function toReportAnswer(status: number, body: unknown): ReportAnswer {
  if (stoppingStatuses.has(status)) return stop;
  if (status !== 200 && status !== 409 && status !== 422) return retry;
  const progress = parseParticipantProgress(body);
  const result = resultOf(body);
  if (!progress || result === 'not-started') return retry;
  if (result === 'race-over' || result === 'abandoned' || result === 'inactive') return stop;
  return status === 200 ? { kind: 'accepted', progress } : { kind: 'refused', progress };
}

function resultOf(body: unknown): unknown {
  return typeof body === 'object' && body !== null && 'result' in body ? body.result : undefined;
}
