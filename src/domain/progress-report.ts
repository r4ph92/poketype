import { gameConfig } from '@/config/game';
import type { ErrorMode } from './text-settings';

// position is the cursor; correctCharacters is how many typed characters match the passage now. In blocked mode they are equal;
// in free mode a kept mistake moves the cursor without being correct, and Backspace moves the cursor back (CONF-08).
export type ProgressReport = { sequence: number; position: number; correctCharacters: number; keystrokes: number; rejectedKeystrokes: number };

export type AcceptedProgress = { lastSequence: number; position: number; correctCharacters: number; keystrokes: number; rejectedKeystrokes: number };

export type ReportToJudge = { previous: AcceptedProgress; report: ProgressReport; passageLength: number; elapsedSinceStartMs: number; errorMode: ErrorMode };

export type ReportJudgement = 'accepted' | 'stale' | 'implausible';

export function parseProgressReport(json: unknown): ProgressReport | null {
  if (!isJsonObject(json)) return null;
  const { sequence, position, correctCharacters, keystrokes, rejectedKeystrokes } = json;
  if (!isCounter(sequence) || !isCounter(position) || !isCounter(correctCharacters) || !isCounter(keystrokes) || !isCounter(rejectedKeystrokes)) return null;
  return sequence >= 1 ? { sequence, position, correctCharacters, keystrokes, rejectedKeystrokes } : null;
}

// The counters are claimed by the client; the server can only bound their order, the passage length and the speed.
export function judgeProgressReport({ previous, report, passageLength, elapsedSinceStartMs, errorMode }: ReportToJudge): ReportJudgement {
  if (report.sequence <= previous.lastSequence) return 'stale';
  if (!followsPrevious(previous, report, errorMode) || !isConsistent(report, passageLength, errorMode)) return 'implausible';
  return isWithinSpeedCaps(report, elapsedSinceStartMs) ? 'accepted' : 'implausible';
}

// Keystrokes and errors only grow. The cursor only moves forward in blocked mode; in free mode Backspace may move it back.
function followsPrevious(previous: AcceptedProgress, report: ProgressReport, errorMode: ErrorMode): boolean {
  if (report.keystrokes < previous.keystrokes || report.rejectedKeystrokes < previous.rejectedKeystrokes) return false;
  return errorMode === 'free' || report.position >= previous.position;
}

// Blocked mode: every correct keystroke advances by exactly one character, and everything typed is correct.
// Free mode: the cursor never passes the characters typed, and no more characters are correct than correct keystrokes were typed.
function isConsistent(report: ProgressReport, passageLength: number, errorMode: ErrorMode): boolean {
  const { position, correctCharacters, keystrokes, rejectedKeystrokes } = report;
  if (position > passageLength || correctCharacters > position || rejectedKeystrokes > keystrokes) return false;
  if (errorMode === 'blocked') return keystrokes - rejectedKeystrokes === position && correctCharacters === position;
  return position <= keystrokes && correctCharacters <= keystrokes - rejectedKeystrokes;
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
  const { lastSequence, position, correctCharacters, keystrokes, rejectedKeystrokes, finishMs } = json;
  if (!isCounter(lastSequence) || !isCounter(position) || !isCounter(correctCharacters) || !isCounter(keystrokes) || !isCounter(rejectedKeystrokes)) return null;
  if (finishMs !== null && !isCounter(finishMs)) return null;
  return { lastSequence, position, correctCharacters, keystrokes, rejectedKeystrokes, finishMs };
}
