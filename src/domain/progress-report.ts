import { gameConfig } from '@/config/game';

export type ProgressReport = { sequence: number; position: number; keystrokes: number; rejectedKeystrokes: number };

export type AcceptedProgress = { lastSequence: number; position: number; keystrokes: number; rejectedKeystrokes: number };

export type ReportToJudge = { previous: AcceptedProgress; report: ProgressReport; passageLength: number; elapsedSinceStartMs: number };

export type ReportJudgement = 'accepted' | 'stale' | 'implausible';

export function parseProgressReport(json: unknown): ProgressReport | null {
  if (!isJsonObject(json)) return null;
  const { sequence, position, keystrokes, rejectedKeystrokes } = json;
  if (!isCounter(sequence) || !isCounter(position) || !isCounter(keystrokes) || !isCounter(rejectedKeystrokes)) return null;
  return sequence >= 1 ? { sequence, position, keystrokes, rejectedKeystrokes } : null;
}

// The counters are claimed by the client; the server can only bound their order, the passage length and the speed.
export function judgeProgressReport({ previous, report, passageLength, elapsedSinceStartMs }: ReportToJudge): ReportJudgement {
  if (report.sequence <= previous.lastSequence) return 'stale';
  if (!followsPrevious(previous, report) || !isConsistent(report, passageLength)) return 'implausible';
  return isWithinSpeedCaps(report, elapsedSinceStartMs) ? 'accepted' : 'implausible';
}

function followsPrevious(previous: AcceptedProgress, report: ProgressReport): boolean {
  return report.position >= previous.position && report.keystrokes >= previous.keystrokes && report.rejectedKeystrokes >= previous.rejectedKeystrokes;
}

// Blocked mode: every correct keystroke advances by exactly one character.
function isConsistent(report: ProgressReport, passageLength: number): boolean {
  return report.position <= passageLength && report.keystrokes - report.rejectedKeystrokes === report.position;
}

function isWithinSpeedCaps(report: ProgressReport, elapsedSinceStartMs: number): boolean {
  const { maxCharactersPerSecond, maxKeystrokesPerSecond } = gameConfig.race;
  return report.position <= speedCap(maxCharactersPerSecond, elapsedSinceStartMs) && report.keystrokes <= speedCap(maxKeystrokesPerSecond, elapsedSinceStartMs);
}

function speedCap(perSecond: number, elapsedMs: number): number {
  return Math.ceil((perSecond * Math.max(0, elapsedMs)) / 1000) + gameConfig.race.progressBurstAllowance;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCounter(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= gameConfig.race.maxProgressCounter;
}

// What the server holds for one participant; finishMs is measured from the race start on the server clock.
export type ParticipantProgress = AcceptedProgress & { finishMs: number | null };

export function parseParticipantProgress(json: unknown): ParticipantProgress | null {
  if (!isJsonObject(json)) return null;
  const { lastSequence, position, keystrokes, rejectedKeystrokes, finishMs } = json;
  if (!isCounter(lastSequence) || !isCounter(position) || !isCounter(keystrokes) || !isCounter(rejectedKeystrokes)) return null;
  if (finishMs !== null && !isCounter(finishMs)) return null;
  return { lastSequence, position, keystrokes, rejectedKeystrokes, finishMs };
}
