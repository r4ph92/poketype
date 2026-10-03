'use client';
import { useEffect, useId, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { PixelButton } from '@/components/pixel/PixelButton';
import { SpriteMotion, useSpriteMotion } from '@/components/pixel/SpriteMotion';
import { speciesOfDex } from '@/domain/pokemon-catalog';
import { RacePokemonPortrait } from '@/features/race/RacePokemonPortrait';
import type { CompletedEvolution } from './EvolutionItemChoices';
import { useEvolutionStage } from './use-evolution-stage';

type EvolutionCelebrationProps = { evolution: CompletedEvolution; onClose: () => void };

// Mounted once per evolution: it opens as a modal straight away and reports when the trainer closes it.
export function EvolutionCelebration({ evolution, onClose }: EvolutionCelebrationProps) {
  const t = useTranslations('Trainer');
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => dialog.current?.showModal(), []);
  const message = t('itemEvolved', { from: t(`species.${evolution.from}`), to: t(`species.${evolution.into}`) });
  return (
    <dialog ref={dialog} aria-labelledby={titleId} onClose={onClose} className="confirm-dialog pixel-frame text-ink">
      <h2 id={titleId} className="font-pixel text-xl font-bold">{t('evolutionTitle')}</h2>
      <SpriteMotion showControls={false}><EvolutionScene evolution={evolution} message={message} /></SpriteMotion>
      <p className="sr-only">{message}</p>
      <PixelButton onClick={() => dialog.current?.close()}>{t('evolutionClose')}</PixelButton>
    </dialog>
  );
}

// Decorative: the screen-reader line beside it states the outcome once.
function EvolutionScene({ evolution, message }: { evolution: CompletedEvolution; message: string }) {
  const motion = useSpriteMotion();
  const stage = useEvolutionStage(motion);
  const species = speciesOfDex(stage === 'evolving' ? evolution.from : evolution.into);
  return (
    <div className="item-evolution" data-animated={motion} aria-hidden="true">
      <div className="xp-reward-pokemon" data-evolution={stage}><RacePokemonPortrait key={species} species={species} /></div>
      {stage === 'evolved' && <p className="xp-evolved">{message}</p>}
    </div>
  );
}
