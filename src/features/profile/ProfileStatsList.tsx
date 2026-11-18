import { getFormatter, getTranslations } from 'next-intl/server';
import type { ProfileStats } from '@/domain/profile-stats';
import { accuracyPercent, formatOptionalWholeNumber, formatWholeNumber } from '@/features/race/race-number-format';

type StatKind = keyof ProfileStats;

const statKinds: readonly StatKind[] = ['bestWpm', 'averageWpm', 'accuracy', 'races', 'wins'];

// The best WPM leads as the record to beat; WPM, accuracy and the averages stay a dash until a race is ranked.
export async function ProfileStatsList({ stats }: { stats: ProfileStats }) {
  const t = await getTranslations('Profile');
  const format = await getFormatter();
  const accuracy = stats.accuracy === null ? formatOptionalWholeNumber(format, null) : t('percent', { value: accuracyPercent(format, stats.accuracy) });
  const shown: Record<StatKind, string> = {
    bestWpm: formatOptionalWholeNumber(format, stats.bestWpm),
    averageWpm: formatOptionalWholeNumber(format, stats.averageWpm),
    accuracy,
    races: formatWholeNumber(format, stats.races),
    wins: formatWholeNumber(format, stats.wins),
  };
  return (
    <dl className="profile-stats">
      {statKinds.map((kind) => <div key={kind} className={kind === 'bestWpm' ? 'profile-stat-record' : undefined}><dt>{t(kind)}</dt><dd>{shown[kind]}</dd></div>)}
    </dl>
  );
}
