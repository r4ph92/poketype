'use client';
import { useTranslations } from 'next-intl';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import type { TrainerStats } from '@/domain/trainer-profile';

type StatKind = keyof TrainerStats;

const statKinds: readonly StatKind[] = ['races', 'wins', 'averageWpm', 'accuracy'];

function StatIcon({ kind }: { kind: StatKind }) {
  const paths: Record<StatKind, string> = {
    races: 'M4 3v23M5 4h19v14H5M6 5h5v5H6m10-5h6v5h-6M11 10h5v6h-5',
    wins: 'M9 3h14v11l-4 5h-6l-4-5V3M9 6H4v8l6 3m13-11h5v8l-6 3M16 19v7M9 28h14',
    averageWpm: 'M3 25V15l5-8 8-3 8 3 5 8v10M8 24v-6m16 6v-6M16 22l6-9',
    accuracy: 'M16 1v8m0 14v8M1 16h8m14 0h8M9 7h14v4h4v12h-4v4H9v-4H5V11h4zM14 14h4v4h-4z',
  };
  return <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" shapeRendering="crispEdges"><path d={paths[kind]} fill="none" stroke="currentColor" strokeWidth="2" /></svg>;
}

// Averages stay a dash until a race is ranked, so a new trainer never reads a made-up 0 % accuracy.
export function TrainerStatsPanel({ stats }: { stats: TrainerStats }) {
  const t = useTranslations('Trainer');
  const shown: Record<StatKind, string> = {
    races: String(stats.races),
    wins: String(stats.wins),
    averageWpm: stats.averageWpm === null ? t('noValue') : String(Math.round(stats.averageWpm)),
    accuracy: stats.accuracy === null ? t('noValue') : t('percent', { value: Math.round(stats.accuracy * 100) }),
  };
  return (
    <PixelPanel titleId="trainer-stats" title={t('stats')}>
      <dl className="trainer-stats">
        {statKinds.map((kind) => <div key={kind}><StatIcon kind={kind} /><dd>{shown[kind]}</dd><dt>{t(kind)}</dt></div>)}
      </dl>
    </PixelPanel>
  );
}
