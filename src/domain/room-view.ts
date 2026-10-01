import { parseRoomId, type RoomId } from './room-id';
import { isRoomPhase, type RoomPhase } from './room-phase';

export type RoomMemberView = { memberKey: string; trainerName: string; isHost: boolean; isViewer: boolean };

// startsAt is epoch milliseconds on the server clock.
export type RaceView = { startsAt: number; passage: string };

export type RoomSnapshot = { roomId: RoomId; phase: RoomPhase; revision: number; members: RoomMemberView[]; race: RaceView | null };

export type SnapshotResponse = { snapshot: RoomSnapshot; serverNow: number };

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
  return { roomId, phase: json.phase, revision: json.revision, members, race };
}

// undefined means malformed, so a snapshot without the race field is rejected rather than read as "no race".
function parseRace(value: unknown): RaceView | null | undefined {
  if (value === null) return null;
  if (!isJsonObject(value)) return undefined;
  const { startsAt, passage } = value;
  if (!isEpochMs(startsAt) || typeof passage !== 'string' || passage.length === 0) return undefined;
  return { startsAt, passage };
}

function parseMembers(value: unknown): RoomMemberView[] | null {
  if (!Array.isArray(value)) return null;
  const members = value.map(parseMember);
  return members.every((member) => member !== null) ? members : null;
}

function parseMember(value: unknown): RoomMemberView | null {
  if (!isJsonObject(value)) return null;
  const { memberKey, trainerName, isHost, isViewer } = value;
  if (typeof memberKey !== 'string' || typeof trainerName !== 'string') return null;
  if (typeof isHost !== 'boolean' || typeof isViewer !== 'boolean') return null;
  return { memberKey, trainerName, isHost, isViewer };
}

function isRevision(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isEpochMs(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
