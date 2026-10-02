import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import type { ParticipantProgress } from '@/domain/progress-report';
import type { RaceId } from '@/domain/race';
import type { RoomId } from '@/domain/room-id';
import type { TextLanguage } from '@/domain/text-settings';
import * as schema from '../db/schema';
import type { DatabaseExecutor } from '../db/types';

export type CurrentRace = { id: RaceId; passage: string; language: TextLanguage; startsAt: Date; deadlineAt: Date; endedAt: Date | null };

export type ParticipantRow = Awaited<ReturnType<typeof selectCurrentParticipant>>[number];

export type RaceParticipantRow = Awaited<ReturnType<typeof findRaceParticipants>>[number];

// The latest race of a room is its current one.
export async function findCurrentRace(executor: DatabaseExecutor, roomId: RoomId): Promise<CurrentRace | null> {
  const [race] = await executor
    .select({
      id: schema.races.id,
      passage: schema.races.passage,
      language: schema.races.textLanguage,
      startsAt: schema.races.startsAt,
      deadlineAt: schema.races.deadlineAt,
      endedAt: schema.races.endedAt,
    })
    .from(schema.races)
    .where(eq(schema.races.roomId, roomId))
    .orderBy(desc(schema.races.createdAt))
    .limit(1);
  return race ?? null;
}

export async function findRoomRace(executor: DatabaseExecutor, roomId: RoomId, raceId: RaceId): Promise<CurrentRace | null> {
  const [race] = await executor
    .select({
      id: schema.races.id,
      passage: schema.races.passage,
      language: schema.races.textLanguage,
      startsAt: schema.races.startsAt,
      deadlineAt: schema.races.deadlineAt,
      endedAt: schema.races.endedAt,
    })
    .from(schema.races)
    .where(and(eq(schema.races.id, raceId), eq(schema.races.roomId, roomId)));
  return race ?? null;
}

export async function findCurrentParticipant(executor: DatabaseExecutor, roomId: RoomId, guestId: GuestId): Promise<ParticipantRow | null> {
  const [participant] = await selectCurrentParticipant(executor, roomId, guestId);
  return participant ?? null;
}

export function findRaceParticipants(executor: DatabaseExecutor, raceId: RaceId) {
  return executor
    .select({
      guestId: schema.raceParticipants.guestId,
      lastSequence: schema.raceParticipants.lastSequence,
      position: schema.raceParticipants.position,
      keystrokes: schema.raceParticipants.keystrokes,
      rejectedKeystrokes: schema.raceParticipants.rejectedKeystrokes,
      finishedAt: schema.raceParticipants.finishedAt,
      abandonedAt: schema.raceParticipants.abandonedAt,
      place: schema.raceParticipants.place,
      grossWpm: schema.raceParticipants.grossWpm,
      score: schema.raceParticipants.score,
      accuracy: schema.raceParticipants.accuracy,
      partnerDex: schema.raceParticipants.partnerDex,
      partnerPokemonId: schema.raceParticipants.partnerPokemonId,
    })
    .from(schema.raceParticipants)
    .where(eq(schema.raceParticipants.raceId, raceId));
}

export async function hasAbandonedRaceIn(executor: DatabaseExecutor, roomId: RoomId, guestId: GuestId): Promise<boolean> {
  const [abandonment] = await executor
    .select({ raceId: schema.raceParticipants.raceId })
    .from(schema.raceParticipants)
    .innerJoin(schema.races, eq(schema.races.id, schema.raceParticipants.raceId))
    .where(and(eq(schema.races.roomId, roomId), eq(schema.raceParticipants.guestId, guestId), isNotNull(schema.raceParticipants.abandonedAt)))
    .limit(1);
  return abandonment !== undefined;
}

export function toParticipantProgress(row: ParticipantRow): ParticipantProgress {
  const { lastSequence, position, keystrokes, rejectedKeystrokes, finishedAt, startsAt } = row;
  return { lastSequence, position, keystrokes, rejectedKeystrokes, finishMs: finishTimeMs(finishedAt, startsAt) };
}

export function finishTimeMs(finishedAt: Date | null, startsAt: Date): number | null {
  return finishedAt ? finishedAt.getTime() - startsAt.getTime() : null;
}

function selectCurrentParticipant(executor: DatabaseExecutor, roomId: RoomId, guestId: GuestId) {
  const currentRaceId = executor.select({ id: schema.races.id }).from(schema.races).where(eq(schema.races.roomId, roomId)).orderBy(desc(schema.races.createdAt)).limit(1);
  return executor
    .select({
      raceId: schema.raceParticipants.raceId,
      lastSequence: schema.raceParticipants.lastSequence,
      position: schema.raceParticipants.position,
      keystrokes: schema.raceParticipants.keystrokes,
      rejectedKeystrokes: schema.raceParticipants.rejectedKeystrokes,
      lastReportedAt: schema.raceParticipants.lastReportedAt,
      finishedAt: schema.raceParticipants.finishedAt,
      abandonedAt: schema.raceParticipants.abandonedAt,
      startsAt: schema.races.startsAt,
    })
    .from(schema.raceParticipants)
    .innerJoin(schema.races, eq(schema.races.id, schema.raceParticipants.raceId))
    .where(and(eq(schema.raceParticipants.guestId, guestId), eq(schema.raceParticipants.raceId, sql`(${currentRaceId})`)));
}
