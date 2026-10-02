'use client';
import { useTranslations } from 'next-intl';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import type { RecentRace } from '@/domain/trainer-profile';

export function RecentRaces({ races }: { races: readonly RecentRace[] }) {
  const t = useTranslations('Trainer');
  return (
    <PixelPanel titleId="recent-races" title={t('recentRaces')}>
      {races.length === 0 ? <DialogueBox><p>{t('noRacesYet')}</p></DialogueBox> : <RecentRaceTable races={races} />}
    </PixelPanel>
  );
}

// XP is not granted yet, so its column shows a dash rather than a number.
function RecentRaceTable({ races }: { races: readonly RecentRace[] }) {
  const t = useTranslations('Trainer');
  return (
    <table className="recent-races-table"><caption className="sr-only">{t('recentRaces')}</caption><thead className="sr-only"><tr><th>{t('route')}</th><th>{t('place')}</th><th>{t('wpmLabel')}</th><th>{t('xp')}</th></tr></thead><tbody>
      {races.map((race) => <tr key={race.raceId}>
        <th scope="row"><span className="route-mini route-forest" aria-hidden="true" />{t('routes.forest')}</th>
        <td><RacePlace place={race.place} /></td>
        <td>{race.grossWpm === null ? t('noValue') : t('wpm', { value: Math.round(race.grossWpm) })}</td>
        <td>{t('noValue')}</td>
      </tr>)}
    </tbody></table>
  );
}

function RacePlace({ place }: { place: number | null }) {
  const t = useTranslations('Trainer');
  if (place === null) return <span>{t('abandoned')}</span>;
  return <span className={`rank-token rank-${place}`}>{t('placeOrdinal', { place })}</span>;
}
