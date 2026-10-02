'use client';
import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { SubmitButton } from '@/components/pixel/SubmitButton';
import type { BagItem } from '@/domain/shop-item';
import type { OwnedPokemon } from '@/domain/trainer-profile';
import { choosePartnerAction } from './choose-partner';
import { EvolutionCelebration } from './EvolutionCelebration';
import { EvolutionChain, PokemonProgress } from './PartnerCard';
import { PokemonArt } from './PokemonArt';
import { ReleaseControl } from './ReleaseControl';
import { StoneChoices, type StoneEvolution } from './StoneChoices';
import { StorageBox } from './StorageBox';

type PcStorageProps = { collection: readonly OwnedPokemon[]; pcBoxes: number; caughtDexes: ReadonlySet<number>; partner: OwnedPokemon; bag: readonly BagItem[] };

// After a stone evolution the evolved Pokémon stays selected, and the celebration plays over the refreshed collection.
// A released Pokémon leaves the collection, so the selection falls back to the partner.
export function PcStorage({ collection, pcBoxes, caughtDexes, partner, bag }: PcStorageProps) {
  const [selectedId, select] = useState<string>(partner.id);
  const [evolution, setEvolution] = useState<StoneEvolution | null>(null);
  const selected = collection.find((pokemon) => pokemon.id === selectedId) ?? partner;
  return (
    <div id="pc-storage" className="pc-layout scroll-mt-4">
      <StorageBox collection={collection} pcBoxes={pcBoxes} selectedId={selected.id} onSelect={select} />
      <StorageDetail pokemon={selected} caughtDexes={caughtDexes}>
        <StoneChoices key={`${selected.id}-${selected.dex}`} pokemon={selected} bag={bag} onEvolved={setEvolution} />
      </StorageDetail>
      {evolution && <EvolutionCelebration key={evolution.into} evolution={evolution} onClose={() => setEvolution(null)} />}
    </div>
  );
}

type StorageDetailProps = { pokemon: OwnedPokemon; caughtDexes: ReadonlySet<number>; children: ReactNode };

function StorageDetail({ pokemon, caughtDexes, children }: StorageDetailProps) {
  const t = useTranslations('Trainer');
  const { races, wins, bestWpm } = pokemon.record;
  return (
    <PixelPanel titleId="storage-detail" title={t(`species.${pokemon.dex}`)} meta={t('dex', { number: pokemon.dex.toString().padStart(3, '0') })}>
      <div className="storage-detail-art"><PokemonArt dex={pokemon.dex} scale={2} /></div>
      <p className="font-pixel text-lg font-bold">{t('level', { level: pokemon.level })}</p>
      <PokemonProgress pokemon={pokemon} />
      <EvolutionChain dex={pokemon.dex} caughtDexes={caughtDexes} />
      <dl className="pokemon-record">
        <div><dt>{t('races')}</dt><dd>{races}</dd></div>
        <div><dt>{t('wins')}</dt><dd>{wins}</dd></div>
        <div><dt>{t('bestWpm')}</dt><dd>{bestWpm === null ? t('noValue') : Math.round(bestWpm)}</dd></div>
      </dl>
      {children}
      {pokemon.isPartner ? <p className="font-pixel font-bold">{t('equipped')}</p> : <form action={choosePartnerAction}><input type="hidden" name="pokemonId" value={pokemon.id} /><SubmitButton label={t('equip')} variant="secondary" /></form>}
      <ReleaseControl key={pokemon.id} pokemon={pokemon} />
    </PixelPanel>
  );
}
