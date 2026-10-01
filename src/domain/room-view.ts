import { isTrainerAvatar, type TrainerAvatarId } from '@/assets/trainers';
import type { AcceptedProgress } from './progress-report';
import { parseRoomId, type RoomId } from './room-id';
import { isRoomPhase, type RoomPhase } from './room-phase';

// finishMs is the finish time measured from the race start, on the server clock.
// abandoned racers keep their last position and no longer type.
export type RacerProgress = { position: number; finishMs: number | null; abandoned: boolean };

// progress is null outside a race phase; in a race phase every member has one.
export type RoomMemberView = { memberKey: string; trainerName: string; trainerAvatar?: TrainerAvatarId; isHost: boolean; isViewer: boolean; progress: RacerProgress | null };

// Frozen when the race settles: accuracy is a 0..1 ratio, errors are the rejected keystrokes, finishMs is measured on the server clock
// and is null for a racer the time limit stopped before the end.
export type RankedResultRow = { memberKey: string; abandoned: false; place: number; grossWpm: number; score: number; accuracy: number; errors: number; finishMs: number | null };

// A racer who abandoned has no place and no metrics, and is listed after the ranked racers.
export type AbandonedResultRow = { memberKey: string; abandoned: true; errors: number };

export type RaceResultRow = RankedResultRow | AbandonedResultRow;

// startsAt and deadlineAt are epoch milliseconds on the server clock; viewer lets a reloaded page resume its own counters and sequence.
// results stay null until the race settles.
export type RaceView = { id: string; startsAt: number; deadlineAt: number; passage: string; viewer: AcceptedProgress | null; results: RaceResultRow[] | null };

export type RoomSnapshot = { roomId: RoomId; phase: RoomPhase; revision: number; members: RoomMemberView[]; race: RaceView | null };

export type SnapshotResponse = { snapshot: RoomSnapshot; serverNow: number };

export function isViewerHost(snapshot: RoomSnapshot): boolean {
  return snapshot.members.some((member) => member.isHost && member.isViewer);
}

// A settled race is over even when the time limit stopped racers before the end.
export function isRaceUnderway(snapshot: RoomSnapshot): boolean {
  if (snapshot.race === null || snapshot.phase === 'results') return false;
  return snapshot.members.some((member) => member.progress !== null && member.progress.finishMs === null && !member.progress.abandoned);
}

type JsonObject = Record<string, unknown>;

export function parseSnapshotResponse(json: unknown): SnapshotResponse | null {
  if (!isJsonObject(json) || !isEpochMs(json.serverNow)) return null;
  const snapshot = parseRoomSnapshot(json);
  return snapshot ? { snapshot, serverNow: json.serverNow } : null;
}

export function parseRoomSnapshot(json: unknown): RoomSnapshot | null {
  if (!isJsonObject(json) || !isRoomPhase(json.phase) || !isRevision(json.revision)) return null;
  const roomId = parseRoomId(json.roomId);
  const members = parseMembers(json.members);
  const race = parseRace(json.race);
  if (!roomId || !members || race === undefined) return null;
  if (race && !hasConsistentResults(race.results, json.phase, members)) return null;
  return { roomId, phase: json.phase, revision: json.revision, members, race };
}

// Results belong to the results phase and name only members of the room.
function hasConsistentResults(results: RaceResultRow[] | null, phase: RoomPhase, members: RoomMemberView[]): boolean {
  if (results === null) return true;
  return phase === 'results' && results.every((result) => members.some((member) => member.memberKey === result.memberKey));
}

// undefined means malformed, so a snapshot without the race field is rejected rather than read as "no race".
function parseRace(value: unknown): RaceView | null | undefined {
  if (value === null) return null;
  if (!isJsonObject(value)) return undefined;
  const { id, startsAt, deadlineAt, passage } = value;
  const viewer = parseViewerProgress(value.viewer);
  const results = parseResults(value.results);
  if (typeof id !== 'string' || id.length === 0 || viewer === undefined || results === undefined) return undefined;
  if (!isEpochMs(startsAt) || !isEpochMs(deadlineAt) || deadlineAt <= startsAt) return undefined;
  if (typeof passage !== 'string' || passage.length === 0) return undefined;
  return { id, startsAt, deadlineAt, passage, viewer, results };
}

function parseResults(value: unknown): RaceResultRow[] | null | undefined {
  if (value === null) return null;
  if (!Array.isArray(value)) return undefined;
  const results = value.map(parseResultRow);
  return results.every((result) => result !== null) ? results : undefined;
}

function parseResultRow(value: unknown): RaceResultRow | null {
  if (!isJsonObject(value)) return null;
  const { memberKey, place, grossWpm, score, accuracy, errors, finishMs, abandoned } = value;
  if (abandoned === true) return typeof memberKey === 'string' && isCount(errors) ? { memberKey, abandoned, errors } : null;
  if (abandoned !== false) return null;
  if (typeof memberKey !== 'string' || !isCount(place) || place < 1 || !isCount(errors) || (finishMs !== null && !isCount(finishMs))) return null;
  if (!isNonNegativeNumber(grossWpm) || !isNonNegativeNumber(score) || !isNonNegativeNumber(accuracy) || accuracy > 1) return null;
  return { memberKey, abandoned, place, grossWpm, score, accuracy, errors, finishMs };
}

function parseViewerProgress(value: unknown): AcceptedProgress | null | undefined {
  if (value === null) return null;
  if (!isJsonObject(value)) return undefined;
  const { lastSequence, position, keystrokes, rejectedKeystrokes } = value;
  if (!isCount(lastSequence) || !isCount(position) || !isCount(keystrokes) || !isCount(rejectedKeystrokes)) return undefined;
  return { lastSequence, position, keystrokes, rejectedKeystrokes };
}

function parseMembers(value: unknown): RoomMemberView[] | null {
  if (!Array.isArray(value)) return null;
  const members = value.map(parseMember);
  return members.every((member) => member !== null) ? members : null;
}

function parseMember(value: unknown): RoomMemberView | null {
  if (!isJsonObject(value)) return null;
  const { memberKey, trainerName, isHost, isViewer } = value;
  const progress = parseRacerProgress(value.progress);
  if (typeof memberKey !== 'string' || typeof trainerName !== 'string' || progress === undefined) return null;
  if (typeof isHost !== 'boolean' || typeof isViewer !== 'boolean') return null;
  return { memberKey, trainerName, isHost, isViewer, progress, ...(isTrainerAvatar(value.trainerAvatar) ? { trainerAvatar: value.trainerAvatar } : {}) };
}

function parseRacerProgress(value: unknown): RacerProgress | null | undefined {
  if (value === null) return null;
  if (!isJsonObject(value)) return undefined;
  const { position, finishMs, abandoned } = value;
  if (!isCount(position) || (finishMs !== null && !isCount(finishMs)) || typeof abandoned !== 'boolean') return undefined;
  return { position, finishMs, abandoned };
}

function isRevision(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isEpochMs(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
