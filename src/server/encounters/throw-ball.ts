import { and, eq } from 'drizzle-orm';
import type { PokedexDex } from '@/assets/pokedex';
import { statusAfterThrow, throwResultOf, type ThrowResult } from '@/domain/encounter-throw';
import type { GuestId } from '@/domain/guest-id';
import { catchesOnThrow, type EncounterStatus, type RandomSource } from '@/domain/wild-encounter';
import * as schema from '../db/schema';
import type { Database, DatabaseTransaction } from '../db/types';
import { secureRandom } from '../random';
import { takeOneFromBag } from '../shop/bag';
import { lockGuest } from '../trainer/guest-lock';
import { countFreeSlots } from '../trainer/pc-storage';

// throwNumber is the throw the trainer means: the first throw is 1.
export type ThrowRequest = { guestId: GuestId; encounterId: string; throwNumber: number };

type EncounterRow = { id: string; guestId: GuestId; dex: PokedexDex; level: number; throwsUsed: number; status: EncounterStatus };

const { wildEncounters, encounterThrows } = schema;

const gone: ThrowResult = { outcome: 'gone' };

// The server rolls the catch under the guest lock; a repeated throw answers what that throw did and spends no second ball.
export async function throwBall(database: Database, request: ThrowRequest, random: RandomSource = secureRandom): Promise<ThrowResult> {
  return database.transaction(async (transaction) => {
    await lockGuest(transaction, request.guestId);
    const encounter = await findEncounter(transaction, request);
    if (!encounter) return gone;
    if (request.throwNumber <= encounter.throwsUsed) return replayThrow(transaction, encounter, request.throwNumber);
    if (encounter.status !== 'waiting' || request.throwNumber !== encounter.throwsUsed + 1) return gone;
    if ((await countFreeSlots(transaction, request.guestId)) === 0) return { outcome: 'pc-full' };
    if (!(await takeOneFromBag(transaction, request.guestId, 'poke-ball'))) return { outcome: 'no-ball' };
    return resolveThrow(transaction, encounter, catchesOnThrow(encounter.dex, random));
  });
}

async function findEncounter(transaction: DatabaseTransaction, { guestId, encounterId }: ThrowRequest): Promise<EncounterRow | null> {
  const [encounter] = await transaction
    .select({ id: wildEncounters.id, guestId: wildEncounters.guestId, dex: wildEncounters.dex, level: wildEncounters.level, throwsUsed: wildEncounters.throwsUsed, status: wildEncounters.status })
    .from(wildEncounters)
    .where(and(eq(wildEncounters.id, encounterId), eq(wildEncounters.guestId, guestId)));
  return encounter ?? null;
}

async function replayThrow(transaction: DatabaseTransaction, encounter: EncounterRow, throwNumber: number): Promise<ThrowResult> {
  const [thrown] = await transaction
    .select({ caught: encounterThrows.caught })
    .from(encounterThrows)
    .where(and(eq(encounterThrows.encounterId, encounter.id), eq(encounterThrows.throwNumber, throwNumber)));
  return thrown ? throwResultOf(encounter.dex, thrown.caught, throwNumber) : gone;
}

// A caught Pokémon joins the collection at the encounter's level with 0 XP; a catch pays no XP and no Poké Dollars.
async function resolveThrow(transaction: DatabaseTransaction, encounter: EncounterRow, caught: boolean): Promise<ThrowResult> {
  const throwNumber = encounter.throwsUsed + 1;
  const status = statusAfterThrow(caught, throwNumber);
  await transaction.insert(encounterThrows).values({ encounterId: encounter.id, throwNumber, caught });
  await transaction
    .update(wildEncounters)
    .set({ throwsUsed: throwNumber, status, resolvedAt: status === 'waiting' ? null : new Date() })
    .where(eq(wildEncounters.id, encounter.id));
  if (caught) await transaction.insert(schema.ownedPokemon).values({ guestId: encounter.guestId, dex: encounter.dex, level: encounter.level });
  return throwResultOf(encounter.dex, caught, throwNumber);
}
