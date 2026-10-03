import { isTrainerAvatar } from '@/assets/trainers';
import { and, asc, eq } from 'drizzle-orm';
import type { PokemonSpecies } from '@/assets/pokemon';
import type { GuestId } from '@/domain/guest-id';
import { lobbyIdleOf } from '@/domain/lobby-idle';
import { speciesOfDex } from '@/domain/pokemon-catalog';
import type { RoomId } from '@/domain/room-id';
import { holdsRace, isRoomOpen, type RoomPhase } from '@/domain/room-phase';
import type { MemberProfile, RaceResultRow, RacerProgress, RaceView, RoomMemberView, RoomSnapshot } from '@/domain/room-view';
import * as schema from '../db/schema';
import type { Database } from '../db/types';
import { findRaceRecords, noRaceRecord, statsOf, type RaceRecord } from '../trainer/race-record';
import { toBotMembers, toBotResultRows } from './bot-views';
import { toRaceResults } from './race-results-view';
import { findCurrentRace, findRaceBots, findRaceParticipants, finishTimeMs, hasAbandonedRaceIn, type CurrentRace, type RaceBotRow, type RaceParticipantRow } from './race-rows';
import { findRoomBots } from './room-bots';
import { textSettingsColumns } from './room-text-settings';
import { findViewerRewards, noViewerRewards, type ViewerRewards } from './viewer-rewards';

type RoomMemberRow = Awaited<ReturnType<typeof selectRoomMemberRows>>[number];

type MemberRoles = { hostGuestId: GuestId; viewerGuestId: GuestId };

type RaceContext = { phase: RoomPhase; viewerGuestId: GuestId; memberKeys: ReadonlyMap<GuestId, string>; rewards: ViewerRewards };

type RaceProgress = { race: CurrentRace; participants: Map<GuestId, RaceParticipantRow>; raceBots: RaceBotRow[] };

// records is read in the waiting phase only, where the lobby profiles show it; a race never pays for it.
type MemberContext = { raceProgress: RaceProgress | null; records: ReadonlyMap<GuestId, RaceRecord> | null };

// closed-idle tells a member their room closed for inactivity; any other closed room answers like an unknown one.
// removed-abandoner tells a player who abandoned a race here that preparing the next race removed them, so their page never rejoins;
// removed-by-host tells a player the host removed from the waiting room.
export type RoomSnapshotResult =
  | { kind: 'snapshot'; snapshot: RoomSnapshot }
  | { kind: 'not-member' }
  | { kind: 'removed-abandoner' }
  | { kind: 'removed-by-host' }
  | { kind: 'not-found' }
  | { kind: 'closed-idle' };

const notFound: RoomSnapshotResult = { kind: 'not-found' };
const notMember: RoomSnapshotResult = { kind: 'not-member' };
const closedIdle: RoomSnapshotResult = { kind: 'closed-idle' };
const removedAbandoner: RoomSnapshotResult = { kind: 'removed-abandoner' };
const removedByHost: RoomSnapshotResult = { kind: 'removed-by-host' };

// Every room has its host as a member, so a room without rows does not exist. Bots come after the players, in the order the host added them;
// a running race shows them where their typing is at the read.
export async function findRoomSnapshot(database: Database, roomId: RoomId, viewerGuestId: GuestId): Promise<RoomSnapshotResult> {
  const readAt = new Date();
  const rows = await selectRoomMemberRows(database, roomId);
  if (rows.length === 0) return notFound;
  const { code, visibility, textSettings, phase, revision, hostGuestId, closeReason, lastActivityAt } = rows[0]!;
  const isViewerMember = rows.some((row) => row.memberGuestId === viewerGuestId);
  if (!isRoomOpen(phase)) return isViewerMember && closeReason === 'idle' ? closedIdle : notFound;
  if (!isViewerMember) return refuseOutsider(database, roomId, viewerGuestId);
  const raceProgress = holdsRace(phase) ? await findRaceProgress(database, roomId) : null;
  const records = phase === 'waiting' ? await findRaceRecords(database, rows.map((row) => row.memberGuestId)) : null;
  const players = rows.map((row) => toMemberView(row, { hostGuestId, viewerGuestId }, { raceProgress, records }));
  const members = [...players, ...toBotMembers(await findRoomBots(database, roomId), raceProgress, readAt)];
  const rewards = raceProgress && phase === 'results' ? await findViewerRewards(database, raceProgress.race.id, viewerGuestId) : noViewerRewards;
  const race = raceProgress ? toRaceView(raceProgress, { phase, viewerGuestId, memberKeys: memberKeysOf(rows), rewards }) : null;
  const lobbyIdle = phase === 'waiting' ? lobbyIdleOf(lastActivityAt) : null;
  return { kind: 'snapshot', snapshot: { roomId, code, visibility, textSettings, phase, revision, members, race, lobbyIdle } };
}

async function refuseOutsider(database: Database, roomId: RoomId, viewerGuestId: GuestId): Promise<RoomSnapshotResult> {
  if (await wasRemovedByHost(database, roomId, viewerGuestId)) return removedByHost;
  return (await hasAbandonedRaceIn(database, roomId, viewerGuestId)) ? removedAbandoner : notMember;
}

async function wasRemovedByHost(database: Database, roomId: RoomId, guestId: GuestId): Promise<boolean> {
  const [removal] = await database
    .select({ removedAt: schema.roomRemovals.removedAt })
    .from(schema.roomRemovals)
    .where(and(eq(schema.roomRemovals.roomId, roomId), eq(schema.roomRemovals.guestId, guestId)));
  return removal !== undefined;
}

// The race row commits in the same transaction as the phase change, so a race phase always finds its race.
async function findRaceProgress(database: Database, roomId: RoomId): Promise<RaceProgress | null> {
  const race = await findCurrentRace(database, roomId);
  if (!race) return null;
  const [rows, raceBots] = await Promise.all([findRaceParticipants(database, race.id), findRaceBots(database, race.id)]);
  return { race, participants: new Map(rows.map((row) => [row.guestId, row])), raceBots };
}

// The phase was read before the race, so a race settling in between shows its results from the next snapshot, matching its phase.
function toRaceView({ race, participants, raceBots }: RaceProgress, { phase, viewerGuestId, memberKeys, rewards }: RaceContext): RaceView {
  const viewer = participants.get(viewerGuestId);
  const viewerProgress = viewer
    ? { lastSequence: viewer.lastSequence, position: viewer.position, keystrokes: viewer.keystrokes, rejectedKeystrokes: viewer.rejectedKeystrokes }
    : null;
  const results = phase === 'results' ? withBotResults(toRaceResults(race, [...participants.values()], memberKeys), race, raceBots) : null;
  const { id, passage, language } = race;
  return { id, startsAt: race.startsAt.getTime(), deadlineAt: race.deadlineAt.getTime(), passage, language, viewer: viewerProgress, results, ...rewards };
}

function withBotResults(results: RaceResultRow[] | null, race: CurrentRace, raceBots: readonly RaceBotRow[]): RaceResultRow[] | null {
  return results === null ? null : [...results, ...toBotResultRows(race, raceBots)];
}

function memberKeysOf(rows: readonly RoomMemberRow[]): Map<GuestId, string> {
  return new Map(rows.map((row) => [row.memberGuestId, row.memberKey]));
}

function toMemberView(row: RoomMemberRow, { hostGuestId, viewerGuestId }: MemberRoles, { raceProgress, records }: MemberContext): RoomMemberView {
  return {
    memberKey: row.memberKey,
    trainerName: row.trainerName,
    ...(isTrainerAvatar(row.trainerAvatar) ? { trainerAvatar: row.trainerAvatar } : {}),
    hasAccount: row.accountId !== null,
    isHost: row.memberGuestId === hostGuestId,
    isViewer: row.memberGuestId === viewerGuestId,
    partner: partnerOf(row, raceProgress),
    profile: records ? profileOf(row, records) : null,
    progress: raceProgress ? racerProgress(raceProgress, row.memberGuestId) : null,
    bot: null,
  };
}

function profileOf(row: RoomMemberRow, records: ReadonlyMap<GuestId, RaceRecord>): MemberProfile {
  return { partnerLevel: row.partnerLevel, ...statsOf(records.get(row.memberGuestId) ?? noRaceRecord) };
}

// A racer keeps the Pokémon recorded at the start, even if they choose another partner while the race runs.
function partnerOf(row: RoomMemberRow, raceProgress: RaceProgress | null): PokemonSpecies | null {
  const participant = raceProgress?.participants.get(row.memberGuestId);
  const dex = participant ? participant.partnerDex : row.partnerDex;
  return dex === null ? null : speciesOfDex(dex);
}

function racerProgress({ race, participants }: RaceProgress, guestId: GuestId): RacerProgress {
  const participant = participants.get(guestId);
  if (!participant) return { position: 0, finishMs: null, abandoned: false, inactive: false, lastProgressMs: 0 };
  const { position, finishedAt, abandonedAt, inactiveAt, lastReportedAt } = participant;
  const lastProgressMs = Math.max(0, finishTimeMs(lastReportedAt, race.startsAt) ?? 0);
  return { position, finishMs: finishTimeMs(finishedAt, race.startsAt), abandoned: abandonedAt !== null, inactive: inactiveAt !== null, lastProgressMs };
}

function selectRoomMemberRows(database: Database, roomId: RoomId) {
  return database
    .select({
      code: schema.rooms.code,
      visibility: schema.rooms.visibility,
      textSettings: textSettingsColumns,
      phase: schema.rooms.phase,
      revision: schema.rooms.revision,
      hostGuestId: schema.rooms.hostGuestId,
      closeReason: schema.rooms.closeReason,
      lastActivityAt: schema.rooms.lastActivityAt,
      memberKey: schema.roomMembers.id,
      memberGuestId: schema.roomMembers.guestId,
      trainerName: schema.guests.trainerName,
      trainerAvatar: schema.users.trainerAvatar,
      accountId: schema.users.id,
      partnerDex: schema.ownedPokemon.dex,
      partnerLevel: schema.ownedPokemon.level,
    })
    .from(schema.rooms)
    .innerJoin(schema.roomMembers, eq(schema.roomMembers.roomId, schema.rooms.id))
    .innerJoin(schema.guests, eq(schema.guests.id, schema.roomMembers.guestId))
    .leftJoin(schema.users, eq(schema.users.guestId, schema.guests.id))
    .leftJoin(schema.ownedPokemon, and(eq(schema.ownedPokemon.guestId, schema.guests.id), eq(schema.ownedPokemon.isPartner, true)))
    .where(eq(schema.rooms.id, roomId))
    .orderBy(asc(schema.roomMembers.joinedAt), asc(schema.roomMembers.id));
}

export async function findRoomPhase(database: Database, roomId: RoomId): Promise<RoomPhase | null> {
  const [room] = await database.select({ phase: schema.rooms.phase }).from(schema.rooms).where(eq(schema.rooms.id, roomId));
  return room?.phase ?? null;
}

export async function findRoomRevision(database: Database, roomId: RoomId): Promise<number | null> {
  const [room] = await database.select({ revision: schema.rooms.revision }).from(schema.rooms).where(eq(schema.rooms.id, roomId));
  return room?.revision ?? null;
}

export type Membership = 'member' | 'not-member' | 'not-found';

export async function findMembership(database: Database, roomId: RoomId, guestId: GuestId): Promise<Membership> {
  const [row] = await database
    .select({ phase: schema.rooms.phase, memberId: schema.roomMembers.id })
    .from(schema.rooms)
    .leftJoin(schema.roomMembers, and(eq(schema.roomMembers.roomId, schema.rooms.id), eq(schema.roomMembers.guestId, guestId)))
    .where(eq(schema.rooms.id, roomId));
  if (!row || !isRoomOpen(row.phase)) return 'not-found';
  return row.memberId ? 'member' : 'not-member';
}
