'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { badgeIds, type BadgeId } from '@/domain/badges';

const decorativeAlt = '';
const badgeDimensions = 64;

export function BadgeShelf({ earned }: { earned: readonly BadgeId[] }) {
  const t = useTranslations('Trainer');
  const [selected, select] = useState<BadgeId>(earned[0] ?? badgeIds[0]!);
  const status = (badge: BadgeId) => t(earned.includes(badge) ? 'earned' : 'locked');
  return (
    <PixelPanel titleId="trainer-badges" title={t('badgesTitle')} meta={t('badgeCount', { count: earned.length, total: badgeIds.length })}>
      <div className="badge-shelf">{badgeIds.map((badge) => <button type="button" key={badge} aria-label={t('badgeLabel', { name: t(`badges.${badge}`), status: status(badge) })} aria-pressed={selected === badge} onClick={() => select(badge)} className="badge-button">
        <Image src={`/assets/badges/${badge}.svg`} width={badgeDimensions} height={badgeDimensions} alt={decorativeAlt} unoptimized className={`pixelated ${earned.includes(badge) ? '' : 'badge-locked'}`} />
      </button>)}</div>
      <Link href="/play/achievements" className="min-h-11 inline-flex items-center underline">{t('achievementsLink')}</Link>
      <p className="badge-caption" role="status">{t(`badges.${selected}`)}{t('separator')}{status(selected)}</p>
    </PixelPanel>
  );
}
