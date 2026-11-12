import { sql } from 'drizzle-orm';
import { passageCorpus } from '../src/assets/passage-corpus';
import { measureComplexity, wordCount } from '../src/domain/corpus';
import { passageLength } from '../src/domain/passage';
import * as schema from '../src/server/db/schema';
import type { Database } from '../src/server/db/types';

// The coherent text corpus (TECH-04). Public content, not accounts, so it is written to every database, production included.
// Upserted by slug: running it again changes nothing, and a corrected passage replaces the stored one. Returns how many passages it holds.
export async function seedPassageCorpus(database: Database): Promise<number> {
  const rows = passageCorpus.map((passage) => {
    const text = passage.text.normalize('NFC');
    return { ...passage, text, length: passageLength(text), wordCount: wordCount(text), complexity: measureComplexity(text) };
  });
  await database
    .insert(schema.passages)
    .values(rows)
    .onConflictDoUpdate({
      target: schema.passages.slug,
      set: {
        language: sql`excluded.language`,
        title: sql`excluded.title`,
        author: sql`excluded.author`,
        source: sql`excluded.source`,
        text: sql`excluded.text`,
        length: sql`excluded.length`,
        wordCount: sql`excluded.word_count`,
        complexity: sql`excluded.complexity`,
      },
    });
  return rows.length;
}
