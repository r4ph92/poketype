'use client';
import { useTranslations } from 'next-intl';
import { ConfirmDialog } from '@/components/pixel/ConfirmDialog';
import type { OwnedPokemon } from '@/domain/trainer-profile';
import { releasePokemonAction } from './release-pokemon';

// The partner races for the trainer, so it is never offered for release.
export function ReleaseControl({ pokemon }: { pokemon: OwnedPokemon }) {
  const t = useTranslations('Trainer');
  if (pokemon.isPartner) return <p className="text-sm text-muted">{t('partnerNoRelease')}</p>;
  const name = t(`species.${pokemon.dex}`);
  return (
    <ConfirmDialog
      triggerLabel={t('release')}
      title={t('releaseTitle', { name })}
      message={t('releaseMessage', { name, level: pokemon.level })}
      confirmLabel={t('releaseConfirm')}
      cancelLabel={t('releaseCancel')}
      pendingLabel={t('releasePending')}
      failureMessage={t('releaseFailed')}
      onConfirm={() => releasePokemonAction(pokemon.id)}
    />
  );
}
