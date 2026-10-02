import type { PokedexDex } from '@/assets/pokedex';
import type { AchievementMetrics } from '@/config/achievements';
import type { GuestId } from '@/domain/guest-id';
import type { OwnedPokemon, TrainerProfile } from '@/domain/trainer-profile';
import type { BadgeId } from '@/domain/badges';
import type { Database } from '../db/types';
import { findWallet } from '../shop/wallet';
import { findCollection } from './collection-queries';
import { findEarnedBadges } from './earned-badges';
import { findRaceRecords, noRaceRecord, statsOf, type RaceRecord } from './race-record';
import { findRecentRaces } from './recent-races';
import { findEvolvedFromDexes } from './xp-rewards';

export async function loadTrainerProfile(database: Database, guestId: GuestId): Promise<TrainerProfile> {
  const [collection, records, recentRaces, badges, evolvedFrom, wallet] = await Promise.all([
    findCollection(database, guestId),
    findRaceRecords(database, [guestId]),
    findRecentRaces(database, guestId),
    findEarnedBadges(database, guestId),
    findEvolvedFromDexes(database, guestId),
    findWallet(database, guestId),
  ]);
  const record = records.get(guestId) ?? noRaceRecord;
  const caughtDexes = caughtDexesOf(collection, evolvedFrom);
  return { collection, ...wallet, caughtDexes, stats: statsOf(record), recentRaces, badges, achievements: achievementMetrics(record, collection, badges) };
}

function caughtDexesOf(collection: readonly OwnedPokemon[], evolvedFrom: readonly PokedexDex[]): PokedexDex[] {
  return [...new Set([...collection.map((pokemon) => pokemon.dex), ...evolvedFrom])].sort((first, second) => first - second);
}

function achievementMetrics(record: RaceRecord, collection: readonly OwnedPokemon[], badges: readonly BadgeId[]): AchievementMetrics {
  return { finishedRaces: record.finishedRaces, wins: record.wins, accurateRaces: record.accurateRaces, speciesOwned: collection.length, badgesEarned: badges.length };
}
