import { randomInt } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { raceWordLists } from '@/assets/word-lists';
import { passagesAtLevel, pickPassage, servedPassageText, type PassageCredit } from '@/domain/corpus';
import { generateRaceText } from '@/domain/race-text';
import type { RoomId } from '@/domain/room-id';
import type { TextSettings } from '@/domain/text-settings';
import * as schema from '../db/schema';
import type { DatabaseExecutor } from '../db/types';

export type RaceText = { passage: string; passageId: string | null };

// Random text is drawn from the word lists; coherent text is the first words of a corpus passage of the race language that has enough of them, adapted to the host's switches, among those whose first words measure at the chosen complexity.
// An empty corpus (a database the seed never reached), or no passage of that level and length, falls back to random words of the same level rather than refusing to start.
// A coherent length above the language's longest passage never gets here: textPickProblem refuses it beforehand (CONF-04).
// null when random words cannot meet the picked characters: the race does not start.
export async function drawRaceText(executor: DatabaseExecutor, roomId: RoomId, settings: TextSettings): Promise<RaceText | null> {
  if (settings.kind === 'coherent') {
    const candidates = await executor
      .select({ id: schema.passages.id, slug: schema.passages.slug, text: schema.passages.text, wordCount: schema.passages.wordCount })
      .from(schema.passages)
      .where(eq(schema.passages.language, settings.language));
    const atLevel = passagesAtLevel(candidates, settings, raceWordLists[settings.language]);
    const chosen = pickPassage(atLevel, settings.wordCount, await findPreviousPassageSlug(executor, roomId), randomInt);
    if (chosen) return { passage: servedPassageText(chosen.text, settings), passageId: chosen.id };
  }
  const passage = generateRaceText(settings.kind === 'coherent' ? withoutPicks(settings) : settings, raceWordLists, randomInt);
  return passage === null ? null : { passage, passageId: null };
}

// Coherent mode never uses the character picks, so the fallback must not be held to a quota it cannot always meet.
function withoutPicks(settings: TextSettings): TextSettings {
  return { ...settings, include: [], exclude: [] };
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
