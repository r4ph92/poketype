import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { GuestId } from '@/domain/guest-id';
import { speciesOfDex } from '@/domain/pokemon-catalog';
import type { RaceId } from '@/domain/race';
import type { ResultRacer } from '@/domain/room-view';
import * as schema from '../db/schema';
import type { Database } from '../db/types';

export type DepartedRacer = { guestId: GuestId; racer: ResultRacer };

// A racer who left the room keeps a stable key that never reveals their guest id.
export function departedRacerKey(raceId: RaceId, guestId: GuestId): string {
  return createHash('sha256').update(`${raceId}:${guestId}`).digest('hex').slice(0, 32);
}

// The live results list every racer of the race, so those who left the room after it are named from the race itself.
export async function findDepartedRacers(database: Database, raceId: RaceId, memberGuestIds: ReadonlySet<GuestId>, viewerGuestId: GuestId): Promise<DepartedRacer[]> {
  const rows = await database
    .select({ guestId: schema.raceParticipants.guestId, trainerName: schema.guests.trainerName, partnerDex: schema.raceParticipants.partnerDex })
    .from(schema.raceParticipants)
    .innerJoin(schema.guests, eq(schema.guests.id, schema.raceParticipants.guestId))
    .where(eq(schema.raceParticipants.raceId, raceId));
  return rows
    .filter((row) => !memberGuestIds.has(row.guestId))
    .map((row) => ({
      guestId: row.guestId,
      racer: { memberKey: departedRacerKey(raceId, row.guestId), trainerName: row.trainerName, isViewer: row.guestId === viewerGuestId, partner: row.partnerDex === null ? null : speciesOfDex(row.partnerDex), bot: null },
    }));
}
