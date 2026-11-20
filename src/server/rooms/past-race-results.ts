import { and, eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import { speciesOfDex } from '@/domain/pokemon-catalog';
import { missedKeysOf, type MissedCharacter } from '@/domain/missed-characters';
import { isRaceParticipant } from '@/domain/race-access';
import type { CatchUpBonusView } from '@/domain/catch-up-bonus-view';
import type { PassageCredit } from '@/domain/corpus';
import type { RaceId } from '@/domain/race';
import type { RoomId } from '@/domain/room-id';
import type { RaceWpmTimelines } from '@/domain/wpm-timeline';
import type { RaceResultRow, ResultRacer } from '@/domain/room-view';
import * as schema from '../db/schema';
import type { Database } from '../db/types';
import { departedRacerKey } from './departed-racers';
import { toBotResultRacer, toBotResultRows } from './bot-views';
import { avatarSeedOf } from '@/server/accounts/avatar-seed';
import { findPassageCredit } from './race-passage';
import { toRaceResults } from './race-results-view';
import { findRaceBonuses, toBonusViews } from './race-bonuses';
import { findRaceBots, findRaceParticipants, findRoomRace } from './race-rows';
import { findViewerRewards, type ViewerRewards } from './viewer-rewards';
import { findRaceWpmTimelines } from './race-wpm-timelines';

export type PastRaceRequest = { roomId: RoomId; raceId: RaceId; viewerGuestId: GuestId };

export type PastRaceResults = { results: RaceResultRow[]; racers: ResultRacer[]; bonuses: CatchUpBonusView[]; credit: PassageCredit | null; missedKeys: MissedCharacter[] | null; wpmTimelines: RaceWpmTimelines } & ViewerRewards;

type RacerRow = Awaited<ReturnType<typeof selectRacerRows>>[number];

// Only the race's own participants, abandoners included, may read it: anyone else gets null and learns nothing, not even that it exists.
// The results come from the rows frozen at settlement, so this page shows the same table as the results screen did.
// missedKeys are the viewer's own, never another racer's; wpmTimelines hold every racer's, like the results table.
export async function findPastRaceResults(database: Database, request: PastRaceRequest): Promise<PastRaceResults | null> {
  const race = await findRoomRace(database, request.roomId, request.raceId);
  if (!race || race.endedAt === null) return null;
  const racerRows = await selectRacerRows(database, request);
  if (!isRaceParticipant(racerRows, request.viewerGuestId)) return null;
  const racers = racerRows.map((row) => ({ guestId: row.guestId, racer: toResultRacer(row, request) }));
  const keys = new Map(racers.map(({ guestId, racer }) => [guestId, racer.memberKey]));
  const [raceBots, participants, bonuses, credit] = await Promise.all([findRaceBots(database, race.id), findRaceParticipants(database, race.id), findRaceBonuses(database, race), findPassageCredit(database, race.passageId)]);
  const results = [...(toRaceResults(race, participants, keys) ?? []), ...toBotResultRows(race, raceBots)];
  const viewerRow = participants.find((participant) => participant.guestId === request.viewerGuestId);
  const missedKeys = missedKeysOf(viewerRow?.missedCharacters ?? null);
  const allRacers = [...racers.map(({ racer }) => racer), ...raceBots.map(toBotResultRacer)];
  const bonusViews = toBonusViews(race, bonuses, keys);
  const wpmTimelines = await findRaceWpmTimelines(database, { race, endedAt: race.endedAt, participants, raceBots, memberKeys: keys });
  return { results, racers: allRacers, bonuses: bonusViews, credit, missedKeys, wpmTimelines, ...(await findViewerRewards(database, race.id, request.viewerGuestId)) };
}

function toResultRacer(row: RacerRow, { raceId, viewerGuestId }: PastRaceRequest): ResultRacer {
  return {
    memberKey: row.memberKey ?? departedRacerKey(raceId, row.guestId),
    trainerName: row.trainerName,
    avatarSeed: avatarSeedOf(row.guestId),
    isViewer: row.guestId === viewerGuestId,
    partner: row.partnerDex === null ? null : speciesOfDex(row.partnerDex),
    bot: null,
  };
}

function selectRacerRows(database: Database, { roomId, raceId }: PastRaceRequest) {
  return database
    .select({
      guestId: schema.raceParticipants.guestId,
      trainerName: schema.guests.trainerName,
      memberKey: schema.roomMembers.id,
      partnerDex: schema.raceParticipants.partnerDex,
    })
    .from(schema.raceParticipants)
    .innerJoin(schema.guests, eq(schema.guests.id, schema.raceParticipants.guestId))
    .leftJoin(schema.roomMembers, and(eq(schema.roomMembers.roomId, roomId), eq(schema.roomMembers.guestId, schema.raceParticipants.guestId)))
    .where(eq(schema.raceParticipants.raceId, raceId));
}
