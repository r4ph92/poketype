'use client';
import { useTranslations } from 'next-intl';

export function UnknownPokemonArt({ scale = 1 }: { scale?: 1 | 2 | 3 }) {
  const t = useTranslations('Trainer');
  return <span role="img" aria-label={t('undiscovered')} className="inline-flex shrink-0 items-center justify-center font-pixel font-bold text-muted" style={{ width: 96 * scale, height: 96 * scale, fontSize: 48 * scale }}>{t('unknown')}</span>;
}
