import { and, asc, count, eq, gt, sql } from 'drizzle-orm';
import { idleThresholdAt } from '@/domain/lobby-idle';
import type { PublicRoom } from '@/domain/public-room';
import * as schema from '../db/schema';
import type { Database } from '../db/types';

const botCount = sql<number>`(select count(*) from ${schema.roomBots} where ${schema.roomBots.roomId} = ${schema.rooms.id})::int`;

const racerCount = sql<number>`(${count(schema.roomMembers.id)} + ${botCount})::int`;

const freeSeats = sql<number>`${schema.rooms.capacity} - ${racerCount}`;

// Unlisted and idle rooms are never offered. The order is the placement order (JOIN-03): fewest free seats first, then oldest.
// Bots take seats like players, so playerCount and the free seats count them both, and a room they fill is not offered.
export async function findPublicRooms(database: Database, limit: number, now: Date): Promise<PublicRoom[]> {
  return database
    .select({ roomId: schema.rooms.id, hostName: schema.guests.trainerName, playerCount: racerCount, capacity: schema.rooms.capacity })
    .from(schema.rooms)
    .innerJoin(schema.roomMembers, eq(schema.roomMembers.roomId, schema.rooms.id))
    .innerJoin(schema.guests, eq(schema.guests.id, schema.rooms.hostGuestId))
    .where(and(eq(schema.rooms.phase, 'waiting'), eq(schema.rooms.visibility, 'public'), gt(schema.rooms.lastActivityAt, idleThresholdAt(now))))
    .groupBy(schema.rooms.id, schema.guests.trainerName)
    .having(gt(freeSeats, 0))
    .orderBy(asc(freeSeats), asc(schema.rooms.createdAt), asc(schema.rooms.id))
    .limit(limit);
}
