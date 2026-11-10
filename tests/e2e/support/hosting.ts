import { drizzle } from 'drizzle-orm/postgres-js';
import { type Page } from '@playwright/test';
import postgres from 'postgres';
import type { GuestId } from '../../../src/domain/guest-id';
import { roomPath } from '../../../src/domain/room-id';
import { hashPassword } from '../../../src/server/accounts/password-hash';
import * as schema from '../../../src/server/db/schema';
import { openRoom } from '../../../src/server/rooms/room-commands';
import { hashSessionToken } from '../../../src/server/sessions/session-token';
import { uniquePassword, uniqueUsername } from './accounts';
import { readSessionToken, withDatabase } from './guests';

const testDatabaseUrl = (): string => process.env.TEST_DATABASE_URL!;

let sharedPasswordHash: Promise<string> | undefined;

// Hashing costs about a third of a second, and no spec logs these hosts in, so one hash serves them all.
function passwordHashForHosts(): Promise<string> {
  sharedPasswordHash ??= hashPassword(uniquePassword());
  return sharedPasswordHash;
}

async function guestIdOf(page: Page, databaseUrl: string): Promise<GuestId> {
  const tokenHash = hashSessionToken(await readSessionToken(page.context()));
  return withDatabase(databaseUrl, async (sql) => {
    const [row] = await sql`select guest_id from sessions where token_hash = ${tokenHash}`;
    return row!.guest_id as GuestId;
  });
}

// Only accounts create rooms, so a spec that needs a host turns its guest into an account in place: same guest row, same session, same name.
// Returns false when the player already has an account. The page keeps showing the guest's hub until it reloads.
export async function promoteToAccount(page: Page, databaseUrl = testDatabaseUrl()): Promise<boolean> {
  const guestId = await guestIdOf(page, databaseUrl);
  const passwordHash = await passwordHashForHosts();
  return withDatabase(databaseUrl, async (sql) => {
    const [existing] = await sql`select id from users where guest_id = ${guestId}`;
    if (existing) return false;
    await sql.begin(async (transaction) => {
      const [user] = await transaction`insert into users (username, guest_id) values (${uniqueUsername('Host_')}, ${guestId}) returning id`;
      await transaction`insert into password_credentials (user_id, password_hash) values (${user!.id}, ${passwordHash})`;
      await transaction`update sessions set user_id = ${user!.id} where guest_id = ${guestId}`;
    });
    return true;
  });
}

// A guest can still hold a room (host transfer, #76), so specs about guest hosts open the room straight in the database.
export async function openRoomHostedByGuest(page: Page, databaseUrl = testDatabaseUrl()): Promise<string> {
  const hostGuestId = await guestIdOf(page, databaseUrl);
  const connection = postgres(databaseUrl, { max: 1 });
  try {
    const roomId = await openRoom(drizzle(connection, { schema }), { hostGuestId, visibility: 'public', openedAt: new Date() });
    await page.goto(roomPath(roomId));
    return roomId;
  } finally {
    await connection.end();
  }
}
