'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { PixelButton } from '@/components/pixel/PixelButton';
import { useIsHydrated } from '@/components/use-is-hydrated';
import type { StarterDex } from '@/domain/starter';
import { PokemonArt } from './PokemonArt';
import { chooseStarterAction } from './choose-starter';
import { initialChooseStarterState } from './choose-starter-state';

type ChooseStarterViewProps = { options: StarterDex[]; next: string | null };

export function ChooseStarterView({ options, next }: ChooseStarterViewProps) {
  const t = useTranslations('ChooseStarter');
  const [selected, select] = useState<StarterDex | null>(null);
  const [state, action, pending] = useActionState(chooseStarterAction, initialChooseStarterState);
  // Without JavaScript nothing can lift the inactive state, so the button stays usable and the required radio asks for a choice instead.
  const isWaitingForChoice = useIsHydrated() && selected === null;
  return <PixelPanel titleId="choose-starter-title" level={1} title={t('title')}>
    <p>{t('intro')}</p>
    <form action={action} className="grid gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      <fieldset disabled={pending} className="min-w-0">
        <legend className="mb-4 font-pixel font-bold">{t('options')}</legend>
        <div className="starter-choice-grid">
          {options.map((dex) => <label key={dex} className="trainer-choice-card">
            <input type="radio" name="starter" value={dex} required checked={selected === dex} onChange={() => select(dex)} className="sr-only" />
            <span className="trainer-choice-face"><PokemonArt dex={dex} scale={2} /><span>{t(`names.${dex}`)}</span></span>
          </label>)}
        </div>
      </fieldset>
      <p className="text-sm text-muted">{t('hint')}</p>
      {state.invalid && <p key={state.attempt} role="alert" className="text-error">{t('invalid')}</p>}
      <PixelButton type="submit" pending={pending} unavailable={isWaitingForChoice}>{t('confirm')}</PixelButton>
    </form>
  </PixelPanel>;
}
