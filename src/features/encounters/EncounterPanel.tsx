'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { SpriteMotion } from '@/components/pixel/SpriteMotion';
import type { WaitingEncounter } from '@/domain/trainer-profile';
import { EncounterMessageLine } from './EncounterMessageLine';
import type { EncounterMessage, EncounterNotice } from './encounter-message';
import { WildPokemonCard } from './WildPokemonCard';

type EncounterPanelProps = { encounters: readonly WaitingEncounter[]; balls: number; hasFreeSlot: boolean };

// Always mounted, so the last message survives the refresh that removes a caught Pokémon from the queue.
export function EncounterPanel({ encounters, balls, hasFreeSlot }: EncounterPanelProps) {
  const t = useTranslations('Encounter');
  const [message, setMessage] = useState<EncounterMessage | null>(null);
  const current = encounters[0];
  if (!current && !message) return null;
  const report = (notice: EncounterNotice) => setMessage({ ...notice, attempt: (message?.attempt ?? 0) + 1 });
  return (
    <div id="encounter" className="scroll-mt-4">
      <PixelPanel titleId="encounter-title" title={t('title')} meta={current ? t('queue', { count: encounters.length }) : undefined}>
        <SpriteMotion showControls={false}>
          {message && <EncounterMessageLine message={message} />}
          {current && <WildPokemonCard key={current.id} encounter={current} balls={balls} hasFreeSlot={hasFreeSlot} onReport={report} />}
        </SpriteMotion>
        {current && <p className="text-sm text-muted">{t('hint')}</p>}
      </PixelPanel>
    </div>
  );
}
