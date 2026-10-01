'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { trainerAvatars, type TrainerAvatarId } from '@/assets/trainers';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { PixelButton } from '@/components/pixel/PixelButton';
import { OverworldTrainer } from '@/components/pixel/OverworldTrainer';
import { PokemonSprite } from '@/components/pixel/PokemonSprite';
import { saveTrainer } from './save-trainer';

export function ChooseTrainerView({ initialAvatar }: { initialAvatar: TrainerAvatarId }) {
  const t = useTranslations('ChooseTrainer');
  const [selected, select] = useState(initialAvatar);
  const [state, action, pending] = useActionState(saveTrainer, { invalid: false });
  return <PixelPanel titleId="choose-trainer-title" level={1} title={t('title')}>
    <p>{t('intro')}</p>
    <form action={action} className="trainer-choice-layout">
      <fieldset disabled={pending} className="min-w-0">
        <legend className="mb-4 font-pixel font-bold">{t('options')}</legend>
        <div className="trainer-choice-grid">
          {trainerAvatars.map((avatar) => <label key={avatar} className="trainer-choice-card">
            <input type="radio" name="avatar" value={avatar} checked={selected === avatar} onChange={() => select(avatar)} className="sr-only" />
            <span className="trainer-choice-face"><OverworldTrainer avatar={avatar} /><span>{t(`names.${avatar}`)}</span></span>
          </label>)}
        </div>
      </fieldset>
      <div className="trainer-choice-preview">
        <h2 className="font-pixel font-bold">{t('preview')}</h2>
        <div className="trainer-choice-camp"><OverworldTrainer avatar={selected} facing="east" /><PokemonSprite species="charmander" scale={2} direction="southwest" animated={false} /></div>
        <p>{t('hint')}</p>
        {state.invalid && <p role="alert" className="text-error">{t('invalid')}</p>}
        <PixelButton type="submit" pending={pending}>{t(pending ? 'saving' : 'confirm')}</PixelButton>
      </div>
    </form>
  </PixelPanel>;
}
