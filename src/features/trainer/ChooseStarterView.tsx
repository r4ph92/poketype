'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { PixelButton } from '@/components/pixel/PixelButton';
import { PokemonArt } from './PokemonArt';
import { demoProfile } from './demo-profile';
import { useDemoTrainer } from './DemoTrainerProvider';

export type StarterDex = 1 | 4 | 7;

export function ChooseStarterView({ options }: { options: StarterDex[] }) {
  const t = useTranslations('ChooseStarter');
  const router = useRouter();
  const { equip } = useDemoTrainer();
  const [selected, select] = useState<StarterDex | null>(null);
  function confirm() {
    if (selected === null) return;
    const pokemon = demoProfile.collection.find((pokemon) => pokemon.dex === selected)!;
    equip(pokemon);
    router.push('/play');
  }
  return <PixelPanel titleId="choose-starter-title" level={1} title={t('title')}>
    <p>{t('intro')}</p>
    <fieldset className="min-w-0">
      <legend className="mb-4 font-pixel font-bold">{t('options')}</legend>
      <div className="starter-choice-grid">
        {options.map((dex) => <label key={dex} className="trainer-choice-card">
          <input type="radio" name="starter" value={dex} checked={selected === dex} onChange={() => select(dex)} className="sr-only" />
          <span className="trainer-choice-face"><PokemonArt dex={dex} scale={2} /><span>{t(`names.${dex}`)}</span></span>
        </label>)}
      </div>
    </fieldset>
    <p className="text-sm text-muted">{t('demoHint')}</p>
    <PixelButton unavailable={selected === null} onClick={confirm}>{t('confirm')}</PixelButton>
  </PixelPanel>;
}
