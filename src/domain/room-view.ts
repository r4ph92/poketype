import { parseRoomId, type RoomId } from './room-id';
import { isRoomPhase, type RoomPhase } from './room-phase';

export type RoomMemberView = { memberKey: string; trainerName: string; isHost: boolean; isViewer: boolean };

export type RoomSnapshot = { roomId: RoomId; phase: RoomPhase; revision: number; members: RoomMemberView[] };

type JsonObject = Record<string, unknown>;

export function parseRoomSnapshot(json: unknown): RoomSnapshot | null {
  if (!isJsonObject(json) || !isRoomPhase(json.phase) || !isRevision(json.revision)) return null;
  const roomId = parseRoomId(json.roomId);
  const members = parseMembers(json.members);
  if (!roomId || !members) return null;
  return { roomId, phase: json.phase, revision: json.revision, members };
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

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
