import { sql as statement } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { RoomId } from '../../../src/domain/room-id';
import * as schema from '../../../src/server/db/schema';
import { findCurrentRace } from '../../../src/server/rooms/race-rows';
import { lockRoom } from '../../../src/server/rooms/room-rows';
import { settleWhenAllFinished } from '../../../src/server/rooms/settle-race';
import { withTestDatabase } from './guests';

export type SettledResult = {
  guestId: string;
  trainerName: string;
  place: number | null;
  grossWpm: number | null;
  score: number | null;
  accuracy: number | null;
  rejectedKeystrokes: number;
  finishMs: number | null;
};

export type SettledRace = { endedAt: Date | null; rulesVersion: number | null; results: SettledResult[] };

// rejectedKeystrokes on top of the whole passage, finished elapsedMs after the start.
export type RacerFinish = { trainerName: string; elapsedMs: number; rejectedKeystrokes: number };

export async function readSettledRace(roomId: string): Promise<SettledRace> {
  const [race] = await withTestDatabase((sql) => sql`select id from races where room_id = ${roomId} order by created_at desc limit 1`);
  return readSettledRaceById(race!.id as string);
}

export async function readSettledRaceById(raceId: string): Promise<SettledRace> {
  return withTestDatabase(async (sql) => {
    const [race] = await sql`select id, ended_at, rules_version from races where id = ${raceId}`;
    const rows = await sql`
      select p.guest_id, g.trainer_name, p.place, p.gross_wpm, p.score, p.accuracy, p.rejected_keystrokes,
        (extract(epoch from p.finished_at - r.starts_at) * 1000)::int as finish_ms
      from race_participants p join races r on r.id = p.race_id join guests g on g.id = p.guest_id
      where p.race_id = ${race!.id}
      order by p.guest_id`;
    return { endedAt: race!.ended_at as Date | null, rulesVersion: race!.rules_version as number | null, results: rows.map(toSettledResult) };
  });
}

function toSettledResult(row: postgres.Row): SettledResult {
  return {
    guestId: row.guest_id as string,
    trainerName: row.trainer_name as string,
    place: row.place as number | null,
    grossWpm: row.gross_wpm as number | null,
    score: row.score as number | null,
    accuracy: row.accuracy as number | null,
    rejectedKeystrokes: row.rejected_keystrokes as number,
    finishMs: row.finish_ms as number | null,
  };
}

// Writes every racer's finish straight into the race, then settles it with the real settlement under the room lock.
export async function finishRaceInDatabase(roomId: string, finishes: RacerFinish[]): Promise<void> {
  const connection = postgres(process.env.TEST_DATABASE_URL!, { max: 1 });
  try {
    await drizzle(connection, { schema }).transaction(async (transaction) => {
      await lockRoom(transaction, roomId as RoomId);
      const race = (await findCurrentRace(transaction, roomId as RoomId))!;
      for (const finish of finishes) await transaction.execute(finishRacerStatement(race.id, finish));
      await settleWhenAllFinished(transaction, roomId as RoomId, race);
      await transaction.execute(statement`update rooms set revision = revision + 1 where id = ${roomId}`);
    });
  } finally {
    await connection.end();
  }
}

function finishRacerStatement(raceId: string, { trainerName, elapsedMs, rejectedKeystrokes }: RacerFinish) {
  return statement`
    update race_participants p
    set position = char_length(r.passage), keystrokes = char_length(r.passage) + ${rejectedKeystrokes}, rejected_keystrokes = ${rejectedKeystrokes},
      last_sequence = 1, finished_at = r.starts_at + ${elapsedMs} * interval '1 millisecond'
    from races r, guests g
    where p.race_id = ${raceId} and r.id = p.race_id and g.id = p.guest_id and g.trainer_name = ${trainerName}`;
}
