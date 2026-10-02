import type { AchievementMetrics } from '@/config/achievements';
import type { GuestId } from '@/domain/guest-id';
import { noRaceStats, type OwnedPokemon, type TrainerProfile, type TrainerStats } from '@/domain/trainer-profile';
import type { BadgeId } from '@/domain/badges';
import type { Database } from '../db/types';
import { findCollection } from './collection-queries';
import { findEarnedBadges } from './earned-badges';
import { findRaceRecords, type RaceRecord } from './race-record';
import { findRecentRaces } from './recent-races';

const noRaceRecord: RaceRecord = { ...noRaceStats, finishedRaces: 0, accurateRaces: 0 };

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

export function statsOf({ races, wins, averageWpm, accuracy }: RaceRecord): TrainerStats {
  return { races, wins, averageWpm, accuracy };
}

function achievementMetrics(record: RaceRecord, collection: readonly OwnedPokemon[], badges: readonly BadgeId[]): AchievementMetrics {
  return { finishedRaces: record.finishedRaces, wins: record.wins, accurateRaces: record.accurateRaces, speciesOwned: collection.length, badgesEarned: badges.length };
}
