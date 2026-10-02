'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { LegendaryArrival, RaceEncounter } from '@/domain/race-discoveries';
import { RacePokemonPortrait } from './RacePokemonPortrait';

const hubEncounterPath = '/play#encounter';

// Shown while the encounter waits in the hub queue; once handled, the results only recall it.
export function EncounterAnnouncement({ encounter }: { encounter: RaceEncounter }) {
  const t = useTranslations('Room');
  const pokemonName = useTranslations('Pokemon');
  return (
    <div className="discovery">
      <RacePokemonPortrait species={encounter.species} />
      <div className="grid gap-1">
        <p className="discovery-title">{t('encounterAppeared')}</p>
        <p>{t('encounterDetail', { name: pokemonName(encounter.species), level: encounter.level })}</p>
        {encounter.status === 'waiting' ? <Link href={hubEncounterPath} className="inline-flex min-h-11 items-center font-pixel underline">{t('encounterLink')}</Link> : <p className="text-sm text-muted">{t('encounterOver')}</p>}
      </div>
    </div>
  );
}

export function LegendaryAnnouncement({ arrival }: { arrival: LegendaryArrival }) {
  const t = useTranslations('Room');
  const name = useTranslations('Pokemon')(arrival.species);
  return (
    <div className="discovery" data-legendary="true">
      <RacePokemonPortrait species={arrival.species} />
      <p className="discovery-title">{t(arrival.isWaiting ? 'legendaryWaiting' : 'legendaryJoined', { name })}</p>
    </div>
  );
}
