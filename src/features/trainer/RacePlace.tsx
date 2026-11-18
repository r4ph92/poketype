import { useTranslations } from 'next-intl';

type RacePlaceProps = { place: number | null; isAbandoned: boolean; isInactive: boolean };

// A player who left the race, on their own (abandon) or removed by the host after a minute without typing, shows that rather than a place.
// Races settled before #136 stored no place for them.
export function RacePlace({ place, isAbandoned, isInactive }: RacePlaceProps) {
  const t = useTranslations('Trainer');
  if (isInactive) return <span>{t('inactive')}</span>;
  if (isAbandoned || place === null) return <span>{t('abandoned')}</span>;
  return <span className={`rank-token rank-${place}`}>{t('placeOrdinal', { place })}</span>;
}
