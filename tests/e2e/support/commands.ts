import { test as base } from '@playwright/test';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { GuestId } from '../../../src/domain/guest-id';
import type { RoomId } from '../../../src/domain/room-id';
import * as schema from '../../../src/server/db/schema';
import type { Database } from '../../../src/server/db/types';
import { openRoom } from '../../../src/server/rooms/room-commands';
import { uniqueName, withDatabase, withTestDatabase } from './guests';

// One connection per test: with fullyParallel, a worker can run afterAll and then take another test from this file.
export const commandTest = base.extend<{ database: Database }>({
  database: async ({}, provide) => {
    const connection = postgres(process.env.TEST_DATABASE_URL!, { max: 4 });
    await provide(drizzle(connection, { schema }));
    await connection.end();
  },
});

export async function insertGuest(trainerName: string): Promise<GuestId> {
  return withTestDatabase(async (sql) => {
    const [guest] = await sql`insert into guests (trainer_name) values (${trainerName}) returning id`;
    return guest!.id as GuestId;
  });
}

export async function openRoomForNewHost(database: Database): Promise<{ roomId: RoomId; hostId: GuestId }> {
  const hostId = await insertGuest(uniqueName('Alex '));
  return { roomId: await openRoom(database, hostId), hostId };
}

type WaitForQueuedCommands = (count: number) => Promise<void>;

// Postgres grants a row lock to its waiters in queue order, so commands queued behind this hold run in the order they were queued.
export async function whileHoldingRoomRow(
  roomId: RoomId,
  work: (waitForQueuedCommands: WaitForQueuedCommands) => Promise<void>,
  databaseUrl = process.env.TEST_DATABASE_URL!,
): Promise<void> {
  await withDatabase(databaseUrl, (sql) =>
    sql.begin(async (transaction) => {
      const [holder] = await transaction`select pg_backend_pid() as pid`;
      await transaction`select id from rooms where id = ${roomId} for update`;
      await work((count) => waitForLockWaiters(transaction, holder!.pid as number, count));
    }),
  );
}

async function waitForLockWaiters(sql: postgres.TransactionSql, holderPid: number, count: number): Promise<void> {
  const deadline = Date.now() + 5_000;
  while ((await countLockWaiters(sql, holderPid)) < count) {
    if (Date.now() > deadline) throw new Error(`Fewer than ${count} commands queued behind the room row lock.`);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

async function countLockWaiters(sql: postgres.TransactionSql, holderPid: number): Promise<number> {
  const [row] = await sql`
    with recursive waiters(pid) as (
      select ${holderPid}::int
      union
      select blocked.pid from (select distinct pid from pg_locks where not granted) blocked join waiters on waiters.pid = any(pg_blocking_pids(blocked.pid))
    )
    select count(*)::int - 1 as total from waiters`;
  return row!.total as number;
}
