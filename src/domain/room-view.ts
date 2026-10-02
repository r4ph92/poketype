import type { PokemonSpecies } from '@/assets/pokemon';
import { isTrainerAvatar, type TrainerAvatarId } from '@/assets/trainers';
import { isCount, isJsonObject, type JsonObject } from './json-guards';
import type { LobbyIdle } from './lobby-idle';
import { isPokemonSpecies } from './pokemon-catalog';
import type { AcceptedProgress } from './progress-report';
import { parseRoomCode, type RoomCode } from './room-code';
import { parseRoomId, type RoomId } from './room-id';
import { isRoomPhase, type RoomPhase } from './room-phase';
import { isRoomVisibility, type RoomVisibility } from './room-visibility';
import { parseXpReward, type XpReward } from './xp-reward';

// finishMs is the finish time measured from the race start, on the server clock.
// abandoned racers keep their last position and no longer type.
export type RacerProgress = { position: number; finishMs: number | null; abandoned: boolean };

// A member's career shown in the lobby profile: partnerLevel is null before a starter, the averages before a ranked race.
export type MemberProfile = { partnerLevel: number | null; races: number; wins: number; averageWpm: number | null; accuracy: number | null };

// progress is null outside a race phase; in a race phase every member has one. profile is sent in the waiting phase only.
// hasAccount tells a logged-in player from a guest, who gets the "Invité" tag in the waiting room.
// partner is the Pokémon racing for the member: the one recorded at the race start during a race, else their current partner; null before a starter.
export type RoomMemberView = {
  memberKey: string;
  trainerName: string;
  trainerAvatar?: TrainerAvatarId;
  partner: PokemonSpecies | null;
  profile: MemberProfile | null;
  hasAccount: boolean;
  isHost: boolean;
  isViewer: boolean;
  progress: RacerProgress | null;
};

// Who a result row names: a room member in the live results, a race participant on a past race's page.
export type ResultRacer = Pick<RoomMemberView, 'memberKey' | 'trainerName' | 'isViewer' | 'partner'>;

// Frozen when the race settles: accuracy is a 0..1 ratio, errors are the rejected keystrokes, finishMs is measured on the server clock
// and is null for a racer the time limit stopped before the end.
export type RankedResultRow = { memberKey: string; abandoned: false; place: number; grossWpm: number; score: number; accuracy: number; errors: number; finishMs: number | null };

// A racer who abandoned has no place and no metrics, and is listed after the ranked racers.
export type AbandonedResultRow = { memberKey: string; abandoned: true; errors: number };

export type RaceResultRow = RankedResultRow | AbandonedResultRow;

// startsAt and deadlineAt are epoch milliseconds on the server clock; viewer lets a reloaded page resume its own counters and sequence.
// results stay null until the race settles; reward is the viewer's own XP grant, read from the ledger with the results.
export type RaceView = {
  id: string;
  startsAt: number;
  deadlineAt: number;
  passage: string;
  viewer: AcceptedProgress | null;
  results: RaceResultRow[] | null;
  reward: XpReward | null;
};

// lobbyIdle is set in the waiting phase only: racing and the results never count as inactivity.
export type RoomSnapshot = {
  roomId: RoomId;
  code: RoomCode;
  visibility: RoomVisibility;
  phase: RoomPhase;
  revision: number;
  members: RoomMemberView[];
  race: RaceView | null;
  lobbyIdle: LobbyIdle | null;
};

export type SnapshotResponse = { snapshot: RoomSnapshot; serverNow: number };

export function isViewerHost(snapshot: RoomSnapshot): boolean {
  return snapshot.members.some((member) => member.isHost && member.isViewer);
}

// A settled race is over even when the time limit stopped racers before the end.
export function isRaceUnderway(snapshot: RoomSnapshot): boolean {
  if (snapshot.race === null || snapshot.phase === 'results') return false;
  return snapshot.members.some((member) => member.progress !== null && member.progress.finishMs === null && !member.progress.abandoned);
}

export function parseSnapshotResponse(json: unknown): SnapshotResponse | null {
  if (!isJsonObject(json) || !isEpochMs(json.serverNow)) return null;
  const snapshot = parseRoomSnapshot(json);
  return snapshot ? { snapshot, serverNow: json.serverNow } : null;
}

export function parseRoomSnapshot(json: unknown): RoomSnapshot | null {
  if (!isJsonObject(json) || !isRoomPhase(json.phase) || !isRevision(json.revision) || !isRoomVisibility(json.visibility)) return null;
  const roomId = parseRoomId(json.roomId);
  const code = parseRoomCode(json.code);
  const members = parseMembers(json.members);
  const race = parseRace(json.race);
  const lobbyIdle = parseLobbyIdle(json.lobbyIdle);
  if (!roomId || !code || !members || race === undefined || lobbyIdle === undefined) return null;
  if (race && !hasConsistentResults(race.results, json.phase, members)) return null;
  if ((lobbyIdle !== null) !== (json.phase === 'waiting')) return null;
  return { roomId, code, visibility: json.visibility, phase: json.phase, revision: json.revision, members, race, lobbyIdle };
}

function parseLobbyIdle(value: unknown): LobbyIdle | null | undefined {
  if (value === null) return null;
  if (!isJsonObject(value)) return undefined;
  const { idleAt, closesAt } = value;
  if (!isEpochMs(idleAt) || !isEpochMs(closesAt) || closesAt <= idleAt) return undefined;
  return { idleAt, closesAt };
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
  const settings = parseRaceSettings(value);
  const viewer = parseViewerProgress(value.viewer);
  const outcome = parseRaceOutcome(value);
  if (!settings || viewer === undefined || !outcome) return undefined;
  return { ...settings, viewer, ...outcome };
}

type RaceSettings = Pick<RaceView, 'id' | 'startsAt' | 'deadlineAt' | 'passage'>;

function parseRaceSettings({ id, startsAt, deadlineAt, passage }: JsonObject): RaceSettings | null {
  if (typeof id !== 'string' || id.length === 0) return null;
  if (!isEpochMs(startsAt) || !isEpochMs(deadlineAt) || deadlineAt <= startsAt) return null;
  if (typeof passage !== 'string' || passage.length === 0) return null;
  return { id, startsAt, deadlineAt, passage };
}

// A reward is granted with the results, so it never comes without them.
function parseRaceOutcome(value: JsonObject): Pick<RaceView, 'results' | 'reward'> | null {
  const results = parseResults(value.results);
  const reward = parseXpReward(value.reward);
  if (results === undefined || reward === undefined) return null;
  if (reward !== null && results === null) return null;
  return { results, reward };
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
  const { memberKey, trainerName, hasAccount, isHost, isViewer } = value;
  const progress = parseRacerProgress(value.progress);
  const career = parseMemberCareer(value);
  if (typeof memberKey !== 'string' || typeof trainerName !== 'string' || progress === undefined || career === undefined) return null;
  if (typeof hasAccount !== 'boolean' || typeof isHost !== 'boolean' || typeof isViewer !== 'boolean') return null;
  const avatar = isTrainerAvatar(value.trainerAvatar) ? { trainerAvatar: value.trainerAvatar } : {};
  return { memberKey, trainerName, hasAccount, isHost, isViewer, progress, ...career, ...avatar };
}

function parseMemberCareer({ partner, profile }: JsonObject): Pick<RoomMemberView, 'partner' | 'profile'> | undefined {
  if (partner !== null && !isPokemonSpecies(partner)) return undefined;
  const parsedProfile = parseMemberProfile(profile);
  return parsedProfile === undefined ? undefined : { partner, profile: parsedProfile };
}

function parseMemberProfile(value: unknown): MemberProfile | null | undefined {
  if (value === null) return null;
  if (!isJsonObject(value)) return undefined;
  const { partnerLevel, races, wins, averageWpm, accuracy } = value;
  if (!isCount(races) || !isCount(wins) || wins > races || !isNullOr(partnerLevel, isCount)) return undefined;
  if (!isNullOr(averageWpm, isNonNegativeNumber) || !isNullOr(accuracy, isRatio)) return undefined;
  return { partnerLevel, races, wins, averageWpm, accuracy };
}

function isNullOr<T>(value: unknown, isValue: (candidate: unknown) => candidate is T): value is T | null {
  return value === null || isValue(value);
}

function isRatio(value: unknown): value is number {
  return isNonNegativeNumber(value) && value <= 1;
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

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
