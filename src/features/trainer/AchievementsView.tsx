'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { UnknownPokemonArt } from './UnknownPokemonArt';
import { demoProfile } from './demo-profile';
import { PokemonArt } from './PokemonArt';
import { legendaryRewards, demoAchievementMetrics, meetsRequirements, badgeMilestones } from '@/config/achievements';

const owned = new Set<number>(demoProfile.collection.map((pokemon) => pokemon.dex));

export function AchievementsView() {
  const t = useTranslations('Achievements');
  const names = useTranslations('Pokemon');
  const decorativeAlt = '';
  return <>
    <PixelPanel titleId="achievements-title" level={1} title={t('title')}>
      <p>{t('intro')}</p><p className="text-sm text-muted">{t('demo')}</p>
      <Link href="/play/pokedex" className="min-h-11 inline-flex items-center underline">{t('catalog')}</Link>
    </PixelPanel>
    <PixelPanel titleId="badge-goals-title" title={t('badgeGoals')}>
      <ol className="badge-goals">{badgeMilestones.map((target, index) => <li key={target}><span className="font-pixel font-bold">{t('badgeNumber', { number: index + 1 })}</span><p>{t('badgeRequirement', { target })}</p></li>)}</ol>
    </PixelPanel>
    <div className="achievement-grid">{legendaryRewards.map((reward) => <PixelPanel key={reward.id} titleId={`goal-${reward.id}`} title={owned.has(reward.dex) ? names(reward.id) : t('unknownName')}>
      <div className="flex items-center justify-center gap-4">{owned.has(reward.dex) ? <PokemonArt dex={reward.dex} scale={2} /> : <UnknownPokemonArt scale={2} />}<Image src={`/assets/badges/${reward.badge}.svg`} width={64} height={64} unoptimized alt={decorativeAlt} /></div>
      <p className="font-pixel font-bold">{t(meetsRequirements(demoAchievementMetrics, reward.requirements) ? 'eligible' : 'locked')}</p>
      <ul className="grid gap-4">{reward.requirements.map(({ metric, target }) => <li key={metric}><label className="grid gap-2"><span>{t(`metrics.${metric}`, { current: demoAchievementMetrics[metric], target })}</span><progress className="w-full" max={target} value={Math.min(target, demoAchievementMetrics[metric])} /></label></li>)}</ul>
      <p className="text-sm text-muted">{t('rewardHint')}</p>
    </PixelPanel>)}</div>
  </>;
}
