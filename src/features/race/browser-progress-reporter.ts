import { gameConfig } from '@/config/game';
import type { AcceptedProgress, ProgressReport } from '@/domain/progress-report';
import type { RoomId } from '@/domain/room-id';
import { toReportAnswer, type ReportAnswer } from './progress-answer';
import { ProgressReporter, type ServerProgressListener } from './progress-reporter';

export function createBrowserProgressReporter(roomId: RoomId, resumeFrom: AcceptedProgress, onServerProgress: ServerProgressListener): ProgressReporter {
  const environment = {
    timing: gameConfig.race,
    now: () => performance.now(),
    schedule: (callback: () => void, delayMs: number) => {
      const timer = window.setTimeout(callback, delayMs);
      return () => window.clearTimeout(timer);
    },
    send: (report: ProgressReport) => sendProgressReport(roomId, report),
  };
  return new ProgressReporter(environment, resumeFrom, onServerProgress);
}

async function sendProgressReport(roomId: RoomId, report: ProgressReport): Promise<ReportAnswer> {
  const response = await fetch(`/api/rooms/${roomId}/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
    cache: 'no-store',
    signal: AbortSignal.timeout(gameConfig.roomSync.requestTimeoutMs),
  });
  const body: unknown = await response.json().catch(() => null);
  return toReportAnswer(response.status, body);
}
