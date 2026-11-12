import { randomInt } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { raceWordLists } from '@/assets/word-lists';
import { adaptPassage, pickPassage, type PassageCredit } from '@/domain/corpus';
import { generateRaceText } from '@/domain/race-text';
import type { RoomId } from '@/domain/room-id';
import type { TextSettings } from '@/domain/text-settings';
import * as schema from '../db/schema';
import type { DatabaseExecutor } from '../db/types';

export type RaceText = { passage: string; passageId: string | null };

// Random text is drawn from the word lists; coherent text is a corpus passage of the race language, adapted to the host's switches.
// An empty corpus (a database the seed never reached) falls back to random words rather than refusing to start.
export async function drawRaceText(executor: DatabaseExecutor, roomId: RoomId, settings: TextSettings): Promise<RaceText> {
  if (settings.kind === 'coherent') {
    const candidates = await executor
      .select({ id: schema.passages.id, slug: schema.passages.slug, text: schema.passages.text, length: schema.passages.length })
      .from(schema.passages)
      .where(eq(schema.passages.language, settings.language));
    const chosen = pickPassage(candidates, settings.length, await findPreviousPassageSlug(executor, roomId), randomInt);
    if (chosen) return { passage: adaptPassage(chosen.text, settings), passageId: chosen.id };
  }
  return { passage: generateRaceText(settings, raceWordLists, randomInt), passageId: null };
}

// The room's latest race, read before the new one is inserted: its passage is the one not to repeat.
async function findPreviousPassageSlug(executor: DatabaseExecutor, roomId: RoomId): Promise<string | null> {
  const [previous] = await executor
    .select({ slug: schema.passages.slug })
    .from(schema.races)
    .leftJoin(schema.passages, eq(schema.passages.id, schema.races.passageId))
    .where(eq(schema.races.roomId, roomId))
    .orderBy(desc(schema.races.createdAt))
    .limit(1);
  return previous?.slug ?? null;
}

export async function findPassageCredit(executor: DatabaseExecutor, passageId: string | null): Promise<PassageCredit | null> {
  if (passageId === null) return null;
  const [credit] = await executor.select({ title: schema.passages.title, author: schema.passages.author }).from(schema.passages).where(eq(schema.passages.id, passageId));
  return credit ?? null;
}
