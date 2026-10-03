import type { PokemonSpecies } from '@/assets/pokemon';
import { isTrainerAvatar, type TrainerAvatarId } from '@/assets/trainers';
import { parseCoinReward, type CoinReward } from './coin-reward';
import { isCount, isJsonObject, type JsonObject } from './json-guards';
import type { LobbyIdle } from './lobby-idle';
import { isPokemonSpecies } from './pokemon-species';
import { parseLegendaryArrivals, parseRaceEncounter, type LegendaryArrival, type RaceEncounter } from './race-discoveries';
import type { AcceptedProgress } from './progress-report';
import { parseRoomCode, type RoomCode } from './room-code';
import { parseRoomId, type RoomId } from './room-id';
import { isRoomPhase, type RoomPhase } from './room-phase';
import { isRoomVisibility, type RoomVisibility } from './room-visibility';
import { isTextLanguage, parseTextSettings, type TextLanguage, type TextSettings } from './text-settings';
import { parseXpReward, type XpReward } from './xp-reward';

// finishMs is the finish time measured from the race start, on the server clock; lastProgressMs is when the server last accepted
// a progress report, measured the same way (0 before any), which tells the host when a racer may be removed as inactive.
// abandoned racers, and inactive ones the host removed from the race, keep their last position and no longer type.
export type RacerProgress = { position: number; finishMs: number | null; abandoned: boolean; inactive: boolean; lastProgressMs: number };

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
export type RankedResultRow = { memberKey: string; standing: 'ranked'; place: number; grossWpm: number; score: number; accuracy: number; errors: number; finishMs: number | null };

// A racer who abandoned, or whom the host removed as inactive, has no place and no metrics, and is listed after the ranked racers.
export type UnrankedResultRow = { memberKey: string; standing: 'abandoned' | 'inactive'; errors: number };

export type RaceResultRow = RankedResultRow | UnrankedResultRow;

// startsAt and deadlineAt are epoch milliseconds on the server clock; language is the text's, set by the host; viewer lets a reloaded page resume its own counters and sequence.
// results stay null until the race settles; reward is the viewer's own XP grant, coins their Poké Dollar payout, encounter the wild Pokémon the race
// put in their queue and legendaries the legendaries it earned them, all read from the database with the results.
export type RaceView = {
  id: string;
  startsAt: number;
  deadlineAt: number;
  passage: string;
  language: TextLanguage;
  viewer: AcceptedProgress | null;
  results: RaceResultRow[] | null;
  reward: XpReward | null;
  coins: CoinReward | null;
  encounter: RaceEncounter | null;
  legendaries: LegendaryArrival[];
};

// lobbyIdle is set in the waiting phase only: racing and the results never count as inactivity.
// textSettings are what the next start will draw the text from, shown to everyone in the lobby.
export type RoomSnapshot = {
  roomId: RoomId;
  code: RoomCode;
  visibility: RoomVisibility;
  textSettings: TextSettings;
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
  return snapshot.members.some((member) => member.progress !== null && isStillRacing(member.progress));
}

export function isStillRacing(progress: RacerProgress): boolean {
  return progress.finishMs === null && !progress.abandoned && !progress.inactive;
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
  const textSettings = parseTextSettings(json.textSettings);
  if (!roomId || !code || !members || !textSettings || race === undefined || lobbyIdle === undefined) return null;
  if (race && !hasConsistentResults(race.results, json.phase, members)) return null;
  if ((lobbyIdle !== null) !== (json.phase === 'waiting')) return null;
  return { roomId, code, visibility: json.visibility, textSettings, phase: json.phase, revision: json.revision, members, race, lobbyIdle };
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

type RaceSettings = Pick<RaceView, 'id' | 'startsAt' | 'deadlineAt' | 'passage' | 'language'>;

function parseRaceSettings({ id, startsAt, deadlineAt, passage, language }: JsonObject): RaceSettings | null {
  if (typeof id !== 'string' || id.length === 0) return null;
  if (!isEpochMs(startsAt) || !isEpochMs(deadlineAt) || deadlineAt <= startsAt) return null;
  if (typeof passage !== 'string' || passage.length === 0 || !isTextLanguage(language)) return null;
  return { id, startsAt, deadlineAt, passage, language };
}

type RaceOutcome = Pick<RaceView, 'results' | 'reward' | 'coins' | 'encounter' | 'legendaries'>;

type ViewerRewards = Omit<RaceOutcome, 'results'>;

// Rewards are granted with the results, so they never come without them.
function parseRaceOutcome(value: JsonObject): RaceOutcome | null {
  const results = parseResults(value.results);
  const rewards = parseViewerRewards(value);
  if (results === undefined || !rewards) return null;
  if (hasAnyReward(rewards) && results === null) return null;
  return { results, ...rewards };
}

function parseViewerRewards(value: JsonObject): ViewerRewards | null {
  const reward = parseXpReward(value.reward);
  const coins = parseCoinReward(value.coins);
  const encounter = parseRaceEncounter(value.encounter);
  const legendaries = parseLegendaryArrivals(value.legendaries);
  if (reward === undefined || coins === undefined || encounter === undefined || legendaries === undefined) return null;
  return { reward, coins, encounter, legendaries };
}

function hasAnyReward({ reward, coins, encounter, legendaries }: ViewerRewards): boolean {
  return reward !== null || coins !== null || encounter !== null || legendaries.length > 0;
}

function parseResults(value: unknown): RaceResultRow[] | null | undefined {
  if (value === null) return null;
  if (!Array.isArray(value)) return undefined;
  const results = value.map(parseResultRow);
  return results.every((result) => result !== null) ? results : undefined;
}

function parseResultRow(value: unknown): RaceResultRow | null {
  if (!isJsonObject(value)) return null;
  const { memberKey, place, grossWpm, score, accuracy, errors, finishMs, standing } = value;
  if (typeof memberKey !== 'string' || !isCount(errors)) return null;
  if (standing === 'abandoned' || standing === 'inactive') return { memberKey, standing, errors };
  if (standing !== 'ranked' || !isCount(place) || place < 1 || (finishMs !== null && !isCount(finishMs))) return null;
  if (!isNonNegativeNumber(grossWpm) || !isNonNegativeNumber(score) || !isNonNegativeNumber(accuracy) || accuracy > 1) return null;
  return { memberKey, standing, place, grossWpm, score, accuracy, errors, finishMs };
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
  const { position, finishMs, abandoned, inactive, lastProgressMs } = value;
  if (!isCount(position) || (finishMs !== null && !isCount(finishMs)) || !isCount(lastProgressMs)) return undefined;
  if (typeof abandoned !== 'boolean' || typeof inactive !== 'boolean') return undefined;
  return { position, finishMs, abandoned, inactive, lastProgressMs };
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
