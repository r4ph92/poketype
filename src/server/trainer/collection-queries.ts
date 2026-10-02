import { and, asc, eq, isNotNull, sql } from 'drizzle-orm';
import type { PokedexDex } from '@/assets/pokedex';
import type { GuestId } from '@/domain/guest-id';
import type { OwnedPokemon, PokemonRecord } from '@/domain/trainer-profile';
import * as schema from '../db/schema';
import type { DatabaseExecutor } from '../db/types';

const noRecord: PokemonRecord = { races: 0, wins: 0, bestWpm: null };

export async function findCollection(executor: DatabaseExecutor, guestId: GuestId): Promise<OwnedPokemon[]> {
  const { ownedPokemon } = schema;
  const owned = await executor
    .select({ dex: ownedPokemon.dex, level: ownedPokemon.level, xp: ownedPokemon.xp, isPartner: ownedPokemon.isPartner })
    .from(ownedPokemon)
    .where(eq(ownedPokemon.guestId, guestId))
    .orderBy(asc(ownedPokemon.dex));
  const records = await findRecordsBySpecies(executor, guestId);
  return owned.map((pokemon) => ({ ...pokemon, record: records.get(pokemon.dex) ?? noRecord }));
}

// Grouped by the species recorded at each race start, so a record follows the Pokémon that actually raced.
async function findRecordsBySpecies(executor: DatabaseExecutor, guestId: GuestId): Promise<Map<PokedexDex, PokemonRecord>> {
  const { raceParticipants: participant, races: race } = schema;
  const rows = await executor
    .select({
      dex: participant.partnerDex,
      races: sql<number>`count(*)::int`,
      wins: sql<number>`(count(*) filter (where ${participant.place} = 1))::int`,
      bestWpm: sql<number | null>`max(${participant.grossWpm})`,
    })
    .from(participant)
    .innerJoin(race, eq(race.id, participant.raceId))
    .where(and(eq(participant.guestId, guestId), isNotNull(race.endedAt), isNotNull(participant.partnerDex)))
    .groupBy(participant.partnerDex);
  return new Map(rows.flatMap(({ dex, ...record }) => (dex === null ? [] : [[dex, record]])));
}
