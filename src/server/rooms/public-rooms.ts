import { and, asc, count, eq, gt, inArray, or, sql, type SQL } from 'drizzle-orm';
import { idleThresholdAt } from '@/domain/lobby-idle';
import { resultsListedSince } from '@/domain/public-room-listing';
import { hostTrainerAvatarField, type PublicRoom } from '@/domain/public-room';
import type { PublicRoomFilter } from '@/domain/public-room-filter';
import { avatarSeedOf } from '@/server/accounts/avatar-seed';
import * as schema from '../db/schema';
import type { Database } from '../db/types';

const botCount = sql<number>`(select count(*) from ${schema.roomBots} where ${schema.roomBots.roomId} = ${schema.rooms.id})::int`;

// A spectating host holds no seat, so a room holding only the host and a few bots lists them alone.
const racerCount = sql<number>`(${count(schema.roomMembers.id)} filter (where ${schema.roomMembers.isSpectator} = false) + ${botCount})::int`;

const freeSeats = sql<number>`${schema.rooms.capacity} - ${racerCount}`;

// A race in countdown or running is one state for the list; the phases are told apart only by the clock.
const state = sql<PublicRoom['state']>`case ${schema.rooms.phase} when 'waiting' then 'waiting' when 'results' then 'results' else 'running' end`;

const stateRank = sql`case ${schema.rooms.phase} when 'waiting' then 0 when 'results' then 2 else 1 end`;

const latestRaceValue = (column: 'deadline_at' | 'ended_at') =>
  sql`(select ${sql.raw(`race.${column}`)} from ${schema.races} race where race.room_id = ${schema.rooms.id} order by race.created_at desc limit 1)`;

const isPublic = eq(schema.rooms.visibility, 'public');

const isOpenForPlayers = and(inArray(schema.rooms.phase, ['waiting', 'results']), gt(freeSeats, 0));

// Unlisted and idle rooms are never offered. The order is the placement order (JOIN-03): fewest free seats first, then oldest,
// whether the room is waiting or showing its results (SALLE-09). Bots take seats like players, so playerCount and the free seats count them both, and a room they fill is not offered.
export async function findPublicRooms(database: Database, limit: number, now: Date): Promise<PublicRoom[]> {
  const where = and(inArray(schema.rooms.phase, ['waiting', 'results']), isListedNow(now));
  return selectPublicRooms(database, limit, { where, having: isOpenForPlayers, order: [asc(freeSeats), asc(schema.rooms.createdAt), asc(schema.rooms.id)] });
}

// The public list also shows the races in progress and the results (JOIN-02), after the waiting rooms; a full waiting room stays hidden.
export async function findPublicRoomList(database: Database, limit: number, now: Date, filter: PublicRoomFilter): Promise<PublicRoom[]> {
  const where = and(inArray(schema.rooms.phase, ['waiting', 'countdown', 'racing', 'results']), isListedNow(now), matchesFilter(filter));
  const having = or(isOpenForPlayers, sql`${schema.rooms.phase} <> 'waiting'`);
  return selectPublicRooms(database, limit, { where, having, order: [asc(stateRank), asc(freeSeats), asc(schema.rooms.createdAt), asc(schema.rooms.id)] });
}

type PublicRoomQuery = { where: SQL | undefined; having: SQL | undefined; order: SQL[] };

async function selectPublicRooms(database: Database, limit: number, { where, having, order }: PublicRoomQuery): Promise<PublicRoom[]> {
  const rows = await database
    .select({
      roomId: schema.rooms.id,
      hostGuestId: schema.rooms.hostGuestId,
      hostName: schema.guests.trainerName,
      hostTrainerAvatar: schema.users.trainerAvatar,
      playerCount: racerCount,
      capacity: schema.rooms.capacity,
      wordCount: schema.rooms.textWordCount,
      textLanguage: schema.rooms.textLanguage,
      complexity: schema.rooms.textComplexity,
      state,
    })
    .from(schema.rooms)
    .innerJoin(schema.roomMembers, eq(schema.roomMembers.roomId, schema.rooms.id))
    .innerJoin(schema.guests, eq(schema.guests.id, schema.rooms.hostGuestId))
    .leftJoin(schema.users, eq(schema.users.guestId, schema.guests.id))
    .where(and(isPublic, where))
    .groupBy(schema.rooms.id, schema.guests.trainerName, schema.users.trainerAvatar)
    .having(having)
    .orderBy(...order)
    .limit(limit);
  return rows.map(({ hostGuestId, hostTrainerAvatar, ...room }) => ({ ...room, hostAvatarSeed: avatarSeedOf(hostGuestId), ...hostTrainerAvatarField(hostTrainerAvatar) }));
}

// A waiting room goes idle, a running race ends at its deadline and results are shown for a while after the race ended.
function isListedNow(now: Date): SQL | undefined {
  const waiting = and(eq(schema.rooms.phase, 'waiting'), gt(schema.rooms.lastActivityAt, idleThresholdAt(now)));
  const running = and(inArray(schema.rooms.phase, ['countdown', 'racing']), sql`${latestRaceValue('deadline_at')} > ${now.toISOString()}::timestamptz`);
  const results = and(eq(schema.rooms.phase, 'results'), sql`coalesce(${latestRaceValue('ended_at')}, ${latestRaceValue('deadline_at')}) > ${resultsListedSince(now).toISOString()}::timestamptz`);
  return or(waiting, running, results);
}

function matchesFilter(filter: PublicRoomFilter): SQL | undefined {
  const language = filter.language === undefined ? undefined : eq(schema.rooms.textLanguage, filter.language);
  const complexity = filter.complexity === undefined ? undefined : eq(schema.rooms.textComplexity, filter.complexity);
  return and(language, complexity);
}
