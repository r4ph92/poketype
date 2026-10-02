'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { gameConfig } from '@/config/game';
import { legendaryRewards, meetsRequirements, type AchievementMetrics } from '@/config/achievements';
import { UnknownPokemonArt } from './UnknownPokemonArt';
import { PokemonArt } from './PokemonArt';

const decorativeAlt = '';

type AchievementsViewProps = { metrics: AchievementMetrics; ownedDexes: ReadonlySet<number> };

// Display only: the progress is real, but reaching a goal grants nothing yet.
export function AchievementsView({ metrics, ownedDexes }: AchievementsViewProps) {
  const t = useTranslations('Achievements');
  return <>
    <PixelPanel titleId="achievements-title" level={1} title={t('title')}>
      <p>{t('intro')}</p>
      <Link href="/play/pokedex" className="min-h-11 inline-flex items-center underline">{t('catalog')}</Link>
    </PixelPanel>
    <PixelPanel titleId="badge-goals-title" title={t('badgeGoals')}>
      <ol className="badge-goals">{gameConfig.badges.map((badge, index) => <li key={badge.id}><span className="font-pixel font-bold">{t('badgeNumber', { number: index + 1 })}</span><p>{t('badgeRequirement', { target: badge.finishedRaces })}</p></li>)}</ol>
    </PixelPanel>
    <div className="achievement-grid">{legendaryRewards.map((reward) => <LegendaryGoal key={reward.id} reward={reward} metrics={metrics} isOwned={ownedDexes.has(reward.dex)} />)}</div>
  </>;
}

type LegendaryGoalProps = { reward: (typeof legendaryRewards)[number]; metrics: AchievementMetrics; isOwned: boolean };

function LegendaryGoal({ reward, metrics, isOwned }: LegendaryGoalProps) {
  const t = useTranslations('Achievements');
  const names = useTranslations('Pokemon');
  return <PixelPanel titleId={`goal-${reward.id}`} title={isOwned ? names(reward.id) : t('unknownName')}>
    <div className="flex items-center justify-center gap-4">{isOwned ? <PokemonArt dex={reward.dex} scale={2} /> : <UnknownPokemonArt scale={2} />}<Image src={`/assets/badges/${reward.badge}.svg`} width={64} height={64} unoptimized alt={decorativeAlt} /></div>
    <p className="font-pixel font-bold">{t(meetsRequirements(metrics, reward.requirements) ? 'eligible' : 'locked')}</p>
    <ul className="grid gap-4">{reward.requirements.map(({ metric, target }) => <li key={metric}><label className="grid gap-2"><span>{t(`metrics.${metric}`, { current: metrics[metric], target })}</span><progress className="w-full" max={target} value={Math.min(target, metrics[metric])} /></label></li>)}</ul>
    <p className="text-sm text-muted">{t('rewardHint')}</p>
  </PixelPanel>;
}
