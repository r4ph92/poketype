'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ConfirmDialog } from '@/components/pixel/ConfirmDialog';
import { isLegendaryDex } from '@/config/achievements';
import type { OwnedPokemon } from '@/domain/trainer-profile';
import { LegendaryReleaseDialog } from './LegendaryReleaseDialog';
import { releasePokemonAction } from './release-pokemon';

// The partner races for the trainer, so it is never offered for release.
// A legendary can never come back, so its first confirmation leads to a second warning dialog.
export function ReleaseControl({ pokemon }: { pokemon: OwnedPokemon }) {
  const t = useTranslations('Trainer');
  const [isSecondConfirmationOpen, setSecondConfirmationOpen] = useState(false);
  if (pokemon.isPartner) return <p className="text-sm text-muted">{t('partnerNoRelease')}</p>;
  const name = t(`species.${pokemon.dex}`);
  const isLegendary = isLegendaryDex(pokemon.dex);
  async function confirmFirst(): Promise<boolean> {
    if (!isLegendary) return releasePokemonAction(pokemon.id);
    setSecondConfirmationOpen(true);
    return true;
  }
  return (
    <>
      <ConfirmDialog
        triggerLabel={t('release')}
        title={t('releaseTitle', { name })}
        message={t('releaseMessage', { name, level: pokemon.level })}
        confirmLabel={t('releaseConfirm')}
        cancelLabel={t('releaseCancel')}
        pendingLabel={t('releasePending')}
        failureMessage={t('releaseFailed')}
        onConfirm={confirmFirst}
      />
      {isSecondConfirmationOpen && (
        <LegendaryReleaseDialog
          title={t('releaseTitle', { name })}
          message={t('legendaryReleaseMessage', { name })}
          confirmLabel={t('legendaryReleaseConfirm', { name })}
          keepLabel={t('legendaryReleaseKeep')}
          pendingLabel={t('releasePending')}
          failureMessage={t('releaseFailed')}
          onConfirm={() => releasePokemonAction(pokemon.id, true)}
          onClose={() => setSecondConfirmationOpen(false)}
        />
      )}
    </>
  );
}
