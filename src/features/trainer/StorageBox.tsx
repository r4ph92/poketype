'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PixelButton } from '@/components/pixel/PixelButton';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { gameConfig } from '@/config/game';
import { splitIntoBoxes, storageCapacity } from '@/domain/pc-storage';
import type { OwnedPokemon } from '@/domain/trainer-profile';
import { PokemonArt } from './PokemonArt';

type StorageBoxProps = { collection: readonly OwnedPokemon[]; pcBoxes: number; selectedId: string; onSelect: (pokemonId: string) => void };

// A search looks through every box at once; otherwise one box shows at a time, with its free slots.
export function StorageBox({ collection, pcBoxes, selectedId, onSelect }: StorageBoxProps) {
  const t = useTranslations('Trainer');
  const [search, setSearch] = useState('');
  const [boxIndex, setBoxIndex] = useState(0);
  const boxes = splitIntoBoxes(collection, pcBoxes);
  const shownIndex = Math.min(boxIndex, boxes.length - 1);
  const query = search.trim().toLocaleLowerCase();
  const visible = query ? collection.filter((pokemon) => t(`species.${pokemon.dex}`).toLocaleLowerCase().includes(query)) : boxes[shownIndex]!;
  return (
    <PixelPanel titleId="storage-title" level={1} title={t('storage')} meta={t('slotsUsed', { count: collection.length, capacity: storageCapacity(boxes.length) })}>
      <div className="storage-tools">
        <input aria-label={t('search')} placeholder={t('search')} value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-11 min-w-0 border-2 border-slate bg-cream-deep px-3" />
      </div>
      <div className="storage-box">
        <ul className="pokemon-grid">
          {visible.map((pokemon) => <li key={pokemon.id}><PokemonSlot pokemon={pokemon} isSelected={pokemon.id === selectedId} onSelect={onSelect} /></li>)}
          {!query && <EmptySlots count={gameConfig.storage.boxSlots - visible.length} />}
        </ul>
        {query && visible.length === 0 && <p className="p-4" role="status">{t('noPokemon')}</p>}
        {!query && <BoxNavigation index={shownIndex} total={boxes.length} onChange={setBoxIndex} />}
      </div>
    </PixelPanel>
  );
}

function PokemonSlot({ pokemon, isSelected, onSelect }: { pokemon: OwnedPokemon; isSelected: boolean; onSelect: (pokemonId: string) => void }) {
  const t = useTranslations('Trainer');
  const name = t(`species.${pokemon.dex}`);
  return (
    <button type="button" aria-label={t('inspect', { name })} aria-pressed={isSelected} onClick={() => onSelect(pokemon.id)} className="pokemon-slot">
      <span className="slot-status">{pokemon.isPartner ? t('active') : name}</span>
      <PokemonArt dex={pokemon.dex} />
      <span className="slot-level">{t('level', { level: pokemon.level })}</span>
    </button>
  );
}

// Decorative: the slot count in the panel heading already tells how many places are free.
function EmptySlots({ count }: { count: number }) {
  return Array.from({ length: Math.max(0, count) }, (_, index) => <li key={`empty-${index}`} aria-hidden="true" className="empty-slot" />);
}

function BoxNavigation({ index, total, onChange }: { index: number; total: number; onChange: (index: number) => void }) {
  const t = useTranslations('Trainer');
  const number = String(index + 1).padStart(2, '0');
  return (
    <div className="box-nav">
      {total > 1 && <PixelButton variant="secondary" unavailable={index === 0} onClick={() => onChange(index - 1)}>{t('previousBox')}</PixelButton>}
      <p className="box-label font-pixel font-bold"><span aria-hidden="true">{t('boxLabel', { number })}</span><span className="sr-only" role="status">{t('boxPosition', { number: index + 1, total })}</span></p>
      {total > 1 && <PixelButton variant="secondary" unavailable={index === total - 1} onClick={() => onChange(index + 1)}>{t('nextBox')}</PixelButton>}
    </div>
  );
}
