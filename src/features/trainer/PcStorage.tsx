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
import { StoneChoices, type StoneEvolution } from './StoneChoices';

type PcStorageProps = { collection: readonly OwnedPokemon[]; caughtDexes: ReadonlySet<number>; partner: OwnedPokemon; bag: readonly BagItem[] };

// After a stone evolution the evolved Pokémon stays selected, and the celebration plays over the refreshed collection.
export function PcStorage({ collection, caughtDexes, partner, bag }: PcStorageProps) {
  const [selectedDex, select] = useState<number>(partner.dex);
  const [evolution, setEvolution] = useState<StoneEvolution | null>(null);
  const selected = collection.find((pokemon) => pokemon.dex === selectedDex) ?? partner;
  const ownedDexes = new Set(collection.map((pokemon) => pokemon.dex));
  function celebrate(evolved: StoneEvolution): void {
    select(evolved.into);
    setEvolution(evolved);
  }
  return (
    <div id="pc-storage" className="pc-layout scroll-mt-4">
      <StorageBox collection={collection} selectedDex={selected.dex} onSelect={select} />
      <StorageDetail pokemon={selected} caughtDexes={caughtDexes}>
        <StoneChoices key={selected.dex} pokemon={selected} ownedDexes={ownedDexes} bag={bag} onEvolved={celebrate} />
      </StorageDetail>
      {evolution && <EvolutionCelebration key={evolution.into} evolution={evolution} onClose={() => setEvolution(null)} />}
    </div>
  );
}

type StorageBoxProps = { collection: readonly OwnedPokemon[]; selectedDex: number; onSelect: (dex: number) => void };

function StorageBox({ collection, selectedDex, onSelect }: StorageBoxProps) {
  const t = useTranslations('Trainer');
  const [search, setSearch] = useState('');
  const nameOf = (pokemon: OwnedPokemon) => t(`species.${pokemon.dex}`);
  const visible = collection.filter((pokemon) => nameOf(pokemon).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return (
    <PixelPanel titleId="storage-title" level={1} title={t('storage')} meta={t('collected', { count: collection.length })}>
      <div className="storage-tools">
        <input aria-label={t('search')} placeholder={t('search')} value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-11 min-w-0 border-2 border-slate bg-cream-deep px-3" />
      </div>
      <div className="storage-box">
        <ul className="pokemon-grid">
          {visible.map((pokemon) => <li key={pokemon.dex}>
            <button type="button" aria-label={t('inspect', { name: nameOf(pokemon) })} aria-pressed={selectedDex === pokemon.dex} onClick={() => onSelect(pokemon.dex)} className="pokemon-slot">
              <span className="slot-status">{pokemon.isPartner ? t('active') : nameOf(pokemon)}</span>
              <PokemonArt dex={pokemon.dex} />
              <span className="slot-level">{t('level', { level: pokemon.level })}</span>
            </button>
          </li>)}
        </ul>
        {visible.length === 0 && <p className="p-4" role="status">{t('noPokemon')}</p>}
        <p className="box-label font-pixel font-bold">{t('box')}</p>
      </div>
    </PixelPanel>
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
      {pokemon.isPartner ? <p className="font-pixel font-bold">{t('equipped')}</p> : <form action={choosePartnerAction}><input type="hidden" name="dex" value={pokemon.dex} /><SubmitButton label={t('equip')} variant="secondary" /></form>}
    </PixelPanel>
  );
}
