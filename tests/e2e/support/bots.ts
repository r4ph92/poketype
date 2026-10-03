import type { BotCharacterId, BotLevel } from '../../../src/assets/bot-characters';
import { withTestDatabase } from './guests';

export type StoredRaceBot = { character: BotCharacterId; level: BotLevel; seed: number; position: number | null; place: number | null; finishedAt: Date | null };

// Seats a bot straight in the database, as the add command would, and bumps the revision so open pages see it.
export async function addBotToRoom(roomId: string, character: BotCharacterId, level: BotLevel): Promise<void> {
  await withTestDatabase(async (sql) => {
    await sql`insert into room_bots (room_id, character, level) values (${roomId}, ${character}, ${level})`;
    await sql`update rooms set revision = revision + 1 where id = ${roomId}`;
  });
}

export async function readRoomBots(roomId: string): Promise<{ character: BotCharacterId; level: BotLevel }[]> {
  return withTestDatabase(async (sql) => {
    const rows = await sql`select character, level from room_bots where room_id = ${roomId} order by added_at, character`;
    return rows.map((row) => ({ character: row.character as BotCharacterId, level: row.level as BotLevel }));
  });
}

export async function readRaceBots(roomId: string): Promise<StoredRaceBot[]> {
  return withTestDatabase(async (sql) => {
    const rows = await sql`
      select character, level, seed, position, place, finished_at from race_bots
      where race_id = (select id from races where room_id = ${roomId} order by created_at desc limit 1)
      order by character`;
    return rows.map((row) => ({
      character: row.character as BotCharacterId,
      level: row.level as BotLevel,
      seed: row.seed as number,
      position: row.position as number | null,
      place: row.place as number | null,
      finishedAt: row.finished_at as Date | null,
    }));
  });
}
