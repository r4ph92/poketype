'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { BallIcon } from '@/components/pixel/icons/icons';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { SpriteMotion, useSpriteMotion } from '@/components/pixel/SpriteMotion';
import { xpToNextLevel } from '@/domain/pokemon-level';
import { hasEvolved, type RewardedPokemon, type XpReward } from '@/domain/xp-reward';
import { RacePokemonPortrait } from './RacePokemonPortrait';
import { useXpReveal } from './use-xp-reveal';
import { xpRevealTimings, xpRewardFrames } from './xp-reward-frames';

// celebrate is true when the results arrived while the page was open; a reloaded page shows the final state without replaying it.
type XpRewardPanelProps = { reward: XpReward | null; celebrate: boolean };

export function XpRewardPanel({ reward, celebrate }: XpRewardPanelProps) {
  const t = useTranslations('Room');
  return (
    <PixelPanel titleId="race-rewards-title" title={<span className="results-panel-title"><BallIcon />{t('raceRewards')}</span>}>
      {reward ? <SpriteMotion showControls={false}><XpRewardReveal reward={reward} celebrate={celebrate} /></SpriteMotion> : <p>{t('noXpReward')}</p>}
      <p className="text-sm text-muted">{t('rewardsHint')}</p>
    </PixelPanel>
  );
}

// The animated scene is decorative; the summary below gives screen readers the final state in one read.
function XpRewardReveal({ reward, celebrate }: { reward: XpReward; celebrate: boolean }) {
  const t = useTranslations('Room');
  const pokemonName = useTranslations('Pokemon');
  const motion = useSpriteMotion();
  const frames = useMemo(() => xpRewardFrames(reward), [reward]);
  const { frame, isAnimated, isFinal } = useXpReveal(frames, celebrate && motion);
  const barStyle = { width: `${frame.ratio * 100}%`, transitionDuration: frame.fills ? `${xpRevealTimings.fillMs}ms` : '0ms' };
  return (
    <>
      <div className="xp-reward" data-animated={isAnimated} aria-hidden="true">
        <div className="xp-reward-pokemon" data-evolution={frame.evolution}><RacePokemonPortrait key={frame.species} species={frame.species} /></div>
        <div className="xp-reward-body">
          <p className="xp-reward-gain">{t('xpGained', { xp: reward.xp })}</p>
          <p className="xp-reward-name"><span className="font-pixel text-lg font-bold">{pokemonName(frame.species)}</span><span className="font-pixel">{t('rewardLevel', { level: frame.level })}</span></p>
          <div className="xp-track"><div style={barStyle} /></div>
          <p className={isFinal ? 'text-sm' : 'text-sm invisible'}><XpAmount pokemon={reward.after} /></p>
          {frame.reachedLevel !== null && <p key={frame.reachedLevel} className="xp-level-up">{t('levelUp', { level: frame.reachedLevel })}</p>}
          {frame.evolution === 'evolved' && <p className="xp-evolved">{t('evolvesInto', { from: pokemonName(reward.before.species), to: pokemonName(reward.after.species) })}</p>}
        </div>
      </div>
      <XpRewardSummary reward={reward} />
    </>
  );
}

function XpRewardSummary({ reward }: { reward: XpReward }) {
  const t = useTranslations('Room');
  const pokemonName = useTranslations('Pokemon');
  const { before, after } = reward;
  return (
    <div className="sr-only">
      <p>{t('xpGained', { xp: reward.xp })}</p>
      <p>{pokemonName(after.species)}</p>
      <p>{t('rewardLevel', { level: after.level })}</p>
      <p><XpAmount pokemon={after} /></p>
      {after.level > before.level && <p>{t('levelUp', { level: after.level })}</p>}
      {hasEvolved(reward) && <p>{t('evolvesInto', { from: pokemonName(before.species), to: pokemonName(after.species) })}</p>}
    </div>
  );
}

function XpAmount({ pokemon }: { pokemon: RewardedPokemon }) {
  const t = useTranslations('Room');
  const total = xpToNextLevel(pokemon.level);
  return <>{total === null ? t('maxLevel') : t('xpAmount', { current: pokemon.xp, total })}</>;
}
