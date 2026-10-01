import { eq, sql } from 'drizzle-orm';
import * as schema from '../db/schema';
import type { Database } from '../db/types';

export async function isUsernameTaken(database: Database, username: string): Promise<boolean> {
  const [row] = await database
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(sql`lower(${schema.users.username})`, username.toLowerCase()))
    .limit(1);
  return row !== undefined;
}
