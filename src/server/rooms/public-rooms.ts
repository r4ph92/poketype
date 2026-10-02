import { and, asc, count, desc, eq, gt, lt } from 'drizzle-orm';
import { gameConfig } from '@/config/game';
import { idleThresholdAt } from '@/domain/lobby-idle';
import type { PublicRoom } from '@/domain/public-room';
import * as schema from '../db/schema';
import type { Database } from '../db/types';

const memberCount = count(schema.roomMembers.id);

// Every room is public until unlisted rooms arrive (#38), except idle ones. The order is the placement order: fullest first, then oldest.
export async function findPublicRooms(database: Database, limit: number, now: Date): Promise<PublicRoom[]> {
  return database
    .select({ roomId: schema.rooms.id, hostName: schema.guests.trainerName, playerCount: memberCount })
    .from(schema.rooms)
    .innerJoin(schema.roomMembers, eq(schema.roomMembers.roomId, schema.rooms.id))
    .innerJoin(schema.guests, eq(schema.guests.id, schema.rooms.hostGuestId))
    .where(and(eq(schema.rooms.phase, 'waiting'), gt(schema.rooms.lastActivityAt, idleThresholdAt(now))))
    .groupBy(schema.rooms.id, schema.guests.trainerName)
    .having(lt(memberCount, gameConfig.rooms.capacity))
    .orderBy(desc(memberCount), asc(schema.rooms.createdAt), asc(schema.rooms.id))
    .limit(limit);
}
