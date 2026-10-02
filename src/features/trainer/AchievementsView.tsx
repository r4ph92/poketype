'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { gameConfig } from '@/config/game';
import { legendaryLevel, legendaryRewards, meetsRequirements, type AchievementMetrics } from '@/config/achievements';
import type { LegendaryStatus } from '@/domain/trainer-profile';
import { UnknownPokemonArt } from './UnknownPokemonArt';
import { PokemonArt } from './PokemonArt';

const decorativeAlt = '';

type AchievementsViewProps = { metrics: AchievementMetrics; legendaries: readonly LegendaryStatus[] };

type GoalStatus = 'obtained' | 'waiting' | 'eligible' | 'locked';

// The server grants a legendary after the race that meets its goals; this page only shows where each one stands.
export function AchievementsView({ metrics, legendaries }: AchievementsViewProps) {
  const t = useTranslations('Achievements');
  return <>
    <PixelPanel titleId="achievements-title" level={1} title={t('title')}>
      <p>{t('intro')}</p>
      <Link href="/play/pokedex" className="min-h-11 inline-flex items-center underline">{t('catalog')}</Link>
    </PixelPanel>
    <PixelPanel titleId="badge-goals-title" title={t('badgeGoals')}>
      <ol className="badge-goals">{gameConfig.badges.map((badge, index) => <li key={badge.id}><span className="font-pixel font-bold">{t('badgeNumber', { number: index + 1 })}</span><p>{t('badgeRequirement', { target: badge.finishedRaces })}</p></li>)}</ol>
    </PixelPanel>
    <div className="achievement-grid">{legendaryRewards.map((reward) => <LegendaryGoal key={reward.id} reward={reward} metrics={metrics} status={goalStatus(reward, metrics, legendaries)} />)}</div>
  </>;
}

type LegendaryReward = (typeof legendaryRewards)[number];

type LegendaryGoalProps = { reward: LegendaryReward; metrics: AchievementMetrics; status: GoalStatus };

function goalStatus(reward: LegendaryReward, metrics: AchievementMetrics, legendaries: readonly LegendaryStatus[]): GoalStatus {
  const granted = legendaries.find((legendary) => legendary.dex === reward.dex);
  if (granted) return granted.isWaiting ? 'waiting' : 'obtained';
  return meetsRequirements(metrics, reward.requirements) ? 'eligible' : 'locked';
}

function LegendaryGoal({ reward, metrics, status }: LegendaryGoalProps) {
  const t = useTranslations('Achievements');
  const names = useTranslations('Pokemon');
  const isOwned = status === 'obtained' || status === 'waiting';
  return <PixelPanel titleId={`goal-${reward.id}`} title={isOwned ? names(reward.id) : t('unknownName')}>
    <div className="flex items-center justify-center gap-4">{isOwned ? <PokemonArt dex={reward.dex} scale={2} /> : <UnknownPokemonArt scale={2} />}<Image src={`/assets/badges/${reward.badge}.svg`} width={64} height={64} unoptimized alt={decorativeAlt} /></div>
    <p className="font-pixel font-bold">{t(status)}</p>
    <ul className="grid gap-4">{reward.requirements.map(({ metric, target }) => <li key={metric}><label className="grid gap-2"><span>{t(`metrics.${metric}`, { current: metrics[metric], target })}</span><progress className="w-full" max={target} value={Math.min(target, metrics[metric])} /></label></li>)}</ul>
    <p className="text-sm text-muted">{t('rewardHint', { level: legendaryLevel })}</p>
  </PixelPanel>;
}
