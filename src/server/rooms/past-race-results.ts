import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import { speciesOfDex } from '@/domain/pokemon-catalog';
import type { RaceId } from '@/domain/race';
import type { RoomId } from '@/domain/room-id';
import type { RaceResultRow, ResultRacer } from '@/domain/room-view';
import * as schema from '../db/schema';
import type { Database } from '../db/types';
import { toBotResultRacer, toBotResultRows } from './bot-views';
import { toRaceResults } from './race-results-view';
import { findRaceBots, findRaceParticipants, findRoomRace } from './race-rows';
import { findViewerRewards, type ViewerRewards } from './viewer-rewards';

export type PastRaceRequest = { roomId: RoomId; raceId: RaceId; viewerGuestId: GuestId };

export type PastRaceResults = { results: RaceResultRow[]; racers: ResultRacer[] } & ViewerRewards;

type RacerRow = Awaited<ReturnType<typeof selectRacerRows>>[number];

// Only the race's own participants, abandoners included, may read it: anyone else gets null and learns nothing, not even that it exists.
// The results come from the rows frozen at settlement, so this page shows the same table as the results screen did.
export async function findPastRaceResults(database: Database, request: PastRaceRequest): Promise<PastRaceResults | null> {
  const race = await findRoomRace(database, request.roomId, request.raceId);
  if (!race || race.endedAt === null) return null;
  const racerRows = await selectRacerRows(database, request);
  if (!racerRows.some((row) => row.guestId === request.viewerGuestId)) return null;
  const racers = racerRows.map((row) => ({ guestId: row.guestId, racer: toResultRacer(row, request) }));
  const keys = new Map(racers.map(({ guestId, racer }) => [guestId, racer.memberKey]));
  const raceBots = await findRaceBots(database, race.id);
  const results = [...(toRaceResults(race, await findRaceParticipants(database, race.id), keys) ?? []), ...toBotResultRows(race, raceBots)];
  const botRacers = raceBots.map(toBotResultRacer);
  return { results, racers: [...racers.map(({ racer }) => racer), ...botRacers], ...(await findViewerRewards(database, race.id, request.viewerGuestId)) };
}

function toResultRacer(row: RacerRow, { raceId, viewerGuestId }: PastRaceRequest): ResultRacer {
  return {
    memberKey: row.memberKey ?? departedRacerKey(raceId, row.guestId),
    trainerName: row.trainerName,
    isViewer: row.guestId === viewerGuestId,
    partner: row.partnerDex === null ? null : speciesOfDex(row.partnerDex),
    bot: null,
  };
}

// A racer still in the room keeps their member key; one who left gets a stable key that never reveals their guest id.
function departedRacerKey(raceId: RaceId, guestId: GuestId): string {
  return createHash('sha256').update(`${raceId}:${guestId}`).digest('hex').slice(0, 32);
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
