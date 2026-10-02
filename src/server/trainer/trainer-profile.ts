import type { AchievementMetrics } from '@/config/achievements';
import type { GuestId } from '@/domain/guest-id';
import type { OwnedPokemon, TrainerProfile } from '@/domain/trainer-profile';
import type { BadgeId } from '@/domain/badges';
import type { Database } from '../db/types';
import { findCollection } from './collection-queries';
import { findEarnedBadges } from './earned-badges';
import { findRaceRecords, noRaceRecord, statsOf, type RaceRecord } from './race-record';
import { findRecentRaces } from './recent-races';

export async function loadTrainerProfile(database: Database, guestId: GuestId): Promise<TrainerProfile> {
  const [collection, records, recentRaces, badges] = await Promise.all([
    findCollection(database, guestId),
    findRaceRecords(database, [guestId]),
    findRecentRaces(database, guestId),
    findEarnedBadges(database, guestId),
  ]);
  const record = records.get(guestId) ?? noRaceRecord;
  return { collection, stats: statsOf(record), recentRaces, badges, achievements: achievementMetrics(record, collection, badges) };
}

function achievementMetrics(record: RaceRecord, collection: readonly OwnedPokemon[], badges: readonly BadgeId[]): AchievementMetrics {
  return { finishedRaces: record.finishedRaces, wins: record.wins, accurateRaces: record.accurateRaces, speciesOwned: collection.length, badgesEarned: badges.length };
}
