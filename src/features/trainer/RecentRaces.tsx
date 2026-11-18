'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import type { RecentRace } from '@/domain/trainer-profile';
import { RacePlace } from './RacePlace';

export function RecentRaces({ races }: { races: readonly RecentRace[] }) {
  const t = useTranslations('Trainer');
  return (
    <PixelPanel titleId="recent-races" title={t('recentRaces')}>
      {races.length === 0 ? <DialogueBox><p>{t('noRacesYet')}</p></DialogueBox> : <RecentRaceTable races={races} />}
      <Link href="/play/history" className="min-h-11 inline-flex items-center font-semibold underline">{t('allRaces')}</Link>
    </PixelPanel>
  );
}

// A race that granted no XP (one settled before XP existed) shows a dash.
function RecentRaceTable({ races }: { races: readonly RecentRace[] }) {
  const t = useTranslations('Trainer');
  return (
    <table className="recent-races-table"><caption className="sr-only">{t('recentRaces')}</caption><thead className="sr-only"><tr><th>{t('route')}</th><th>{t('place')}</th><th>{t('wpmLabel')}</th><th>{t('xp')}</th></tr></thead><tbody>
      {races.map((race) => <tr key={race.raceId}>
        <th scope="row"><span className="route-mini route-forest" aria-hidden="true" />{t('routes.forest')}</th>
        <td><RacePlace place={race.place} isAbandoned={race.isAbandoned} isInactive={race.isInactive} /></td>
        <td>{race.grossWpm === null ? t('noValue') : t('wpm', { value: Math.round(race.grossWpm) })}</td>
        <td>{race.xp === null ? t('noValue') : t('xpEarned', { xp: race.xp })}</td>
      </tr>)}
    </tbody></table>
  );
}
