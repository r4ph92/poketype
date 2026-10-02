import type { PokedexDex } from '@/assets/pokedex';
import type { GuestId } from '@/domain/guest-id';
import type { OwnedPokemon, TrainerProfile } from '@/domain/trainer-profile';
import type { Database } from '../db/types';
import { findWaitingEncounters } from '../encounters/encounter-queries';
import { findWallet } from '../shop/wallet';
import { achievementMetricsOf } from './achievement-metrics';
import { findCollection } from './collection-queries';
import { findEarnedBadges } from './earned-badges';
import { findLegendaryStatuses } from './legendary-queries';
import { findPcBoxes } from './pc-storage';
import { findRaceRecords, noRaceRecord, statsOf } from './race-record';
import { findRecentRaces } from './recent-races';
import { findReleasedDexes } from './release-pokemon';
import { findEvolvedFromDexes } from './xp-rewards';

export async function loadTrainerProfile(database: Database, guestId: GuestId): Promise<TrainerProfile> {
  const [collection, records, recentRaces, badges, evolvedFrom, released, wallet, pcBoxes, encounters, legendaries] = await Promise.all([
    findCollection(database, guestId),
    findRaceRecords(database, [guestId]),
    findRecentRaces(database, guestId),
    findEarnedBadges(database, guestId),
    findEvolvedFromDexes(database, guestId),
    findReleasedDexes(database, guestId),
    findWallet(database, guestId),
    findPcBoxes(database, guestId),
    findWaitingEncounters(database, guestId),
    findLegendaryStatuses(database, guestId),
  ]);
  const record = records.get(guestId) ?? noRaceRecord;
  const speciesOwned = new Set(collection.map((pokemon) => pokemon.dex)).size;
  const achievements = achievementMetricsOf(record, { speciesOwned, badgesEarned: badges.length });
  const caughtDexes = caughtDexesOf(collection, [...evolvedFrom, ...released]);
  return { collection, ...wallet, pcBoxes, encounters, legendaries, caughtDexes, stats: statsOf(record), recentRaces, badges, achievements };
}

// A Pokémon that evolved or was released left the collection under that species, which stays caught in the Pokédex.
function caughtDexesOf(collection: readonly OwnedPokemon[], formerDexes: readonly PokedexDex[]): PokedexDex[] {
  return [...new Set([...collection.map((pokemon) => pokemon.dex), ...formerDexes])].sort((first, second) => first - second);
}
