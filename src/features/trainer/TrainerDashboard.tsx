'use client';
import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { PixelLink } from '@/components/pixel/PixelButton';
import { OverworldTrainer } from '@/components/pixel/OverworldTrainer';
import { PokemonSprite } from '@/components/pixel/PokemonSprite';
import { freeSlots } from '@/domain/pc-storage';
import { speciesOfDex } from '@/domain/pokemon-catalog';
import { quantityInBag } from '@/domain/shop-item';
import { EncounterPanel } from '@/features/encounters/EncounterPanel';
import { BadgeShelf } from './BadgeShelf';
import { PartnerCard } from './PartnerCard';
import { PracticeButton } from './PracticeButton';
import { RecentRaces } from './RecentRaces';
import { TrainerStatsPanel } from './TrainerStatsPanel';
import { WalletCard } from './WalletCard';
import { caughtDexesOf, type TrainerHubView } from './trainer-hub-view';

const decorativeAlt = '';

type TrainerDashboardProps = { greeting: string; status: ReactNode; raceAction: ReactNode; joinByCode: ReactNode; trainer: TrainerHubView };

export function TrainerDashboard({ greeting, status, raceAction, joinByCode, trainer }: TrainerDashboardProps) {
  const t = useTranslations('Trainer');
  const { profile, partner, canChooseTrainer } = trainer;
  return (
    <>
      <div className="trainer-layout">
        <div className="trainer-column">
          <PixelPanel titleId="play-title" level={1} title={greeting} meta={status} variant="scene">
            <p className="trainer-welcome">{t('welcome')}</p>
            <TrainerCamp trainer={trainer} />
            <div id="race-actions" className="trainer-actions">{raceAction}<PracticeButton /></div>
            <div className="trainer-join">{joinByCode}</div>
          </PixelPanel>
          <EncounterPanel encounters={profile.encounters} balls={quantityInBag(profile.bag, 'poke-ball')} hasFreeSlot={freeSlots(profile.collection.length, profile.pcBoxes) > 0} />
          <RecentRaces races={profile.recentRaces} />
        </div>
        <div className="trainer-column">
          <PartnerCard pokemon={partner} caughtDexes={caughtDexesOf(profile)} />
          <PixelLink href="/play/pokedex">{t('pokedexLink')}</PixelLink>
          <WalletCard coins={profile.coins} />
          <TrainerStatsPanel stats={profile.stats} />
          <BadgeShelf earned={profile.badges} />
        </div>
      </div>
      <TrainerFooter partner={partner} canChooseTrainer={canChooseTrainer} />
    </>
  );
}

function TrainerFooter({ partner, canChooseTrainer }: Pick<TrainerHubView, 'partner' | 'canChooseTrainer'>) {
  const t = useTranslations('Trainer');
  return <div className="trainer-bottom">{canChooseTrainer && <Link href="/choose-trainer" className="inline-flex min-h-11 items-center font-pixel underline">{t('changeTrainer')}</Link>}<p role="status">{t('partnerHint', { name: t(`species.${partner.dex}`) })}</p></div>;
}

function TrainerCamp({ trainer: { avatar, partner } }: { trainer: TrainerHubView }) {
  return (
    <div id="route-preview" className="trainer-camp">
      <Image src="/assets/scenes/camp.svg" width={800} height={460} alt={decorativeAlt} unoptimized priority className="camp-art" />
      <div className="camp-trainer"><OverworldTrainer avatar={avatar} scale={2} facing="east" /></div>
      <div className="camp-partner"><PokemonSprite species={speciesOfDex(partner.dex)} scale={2} stage="fit" direction="west" animated={false} /></div>
    </div>
  );
}
