'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { pokedex, type PokedexEntry, type PokedexRegion } from '@/assets/pokedex';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { PixelButton } from '@/components/pixel/PixelButton';
import { PokemonSprite } from '@/components/pixel/PokemonSprite';
import { SpriteMotion } from '@/components/pixel/SpriteMotion';
import type { OwnedPokemon } from '@/domain/trainer-profile';
import { PokemonArt } from './PokemonArt';
import { PokemonProgress } from './PartnerCard';
import { PokedexRegionPicker } from './PokedexRegionPicker';
import { entriesOfRegion, matchesFilter, pokedexFilters, unlockHintOf, type PokedexFilter } from './pokedex-catalog';

const pageSize = 24;

// Species the trainer has not caught keep their name hidden.
function useDisplayName(caught: ReadonlySet<number>): (pokemon: PokedexEntry) => string {
  const t = useTranslations('Pokedex');
  const name = useTranslations('Pokemon');
  return (pokemon) => (caught.has(pokemon.dex) ? name(pokemon.species) : t('unknownName'));
}

// A species stays caught after its Pokémon evolved; level and XP show only for a Pokémon the trainer still owns.
export function PokedexView({ collection, caughtDexes }: { collection: readonly OwnedPokemon[]; caughtDexes: readonly number[] }) {
  const t = useTranslations('Pokedex');
  const caught = new Set<number>(caughtDexes);
  const browser = usePokedexBrowser(caught);
  const caughtCount = pokedex.filter((pokemon) => caught.has(pokemon.dex)).length;
  return <>
    <PixelPanel titleId="pokedex-title" level={1} title={t('title')} meta={t('caughtProgress', { count: caughtCount, total: pokedex.length })}>
      <p>{t('intro')}</p>
      <progress className="h-4 w-full accent-ink" value={caughtCount} max={pokedex.length} aria-label={t('caughtProgress', { count: caughtCount, total: pokedex.length })} />
      <div className="flex flex-wrap gap-3"><Link href="/play/collection" className="min-h-11 inline-flex items-center underline">{t('collection')}</Link><Link href="/play/achievements" className="min-h-11 inline-flex items-center underline">{t('achievements')}</Link></div>
      <PokedexRegionPicker region={browser.region} caught={caught} onChoose={browser.changeRegion} />
      <div className="flex flex-wrap gap-3"><input aria-label={t('search')} placeholder={t('search')} value={browser.query} onChange={(event) => browser.changeQuery(event.target.value)} className="min-h-11 border-2 border-frame bg-cream-deep p-2" /><div className="flex flex-wrap gap-2" role="group" aria-label={t('filters')}>{pokedexFilters.map((value) => <button type="button" key={value} aria-pressed={browser.filter === value} className="storage-filter" onClick={() => browser.changeFilter(value)}>{t(value)}</button>)}</div></div>
    </PixelPanel>
    <div className="pokedex-layout">
      <PokedexGrid matches={browser.matches} region={browser.region} caught={caught} page={browser.page} onPage={browser.setPage} selected={browser.selected} onSelect={browser.select} />
      <PokedexDetail key={browser.selected.dex} pokemon={browser.selected} caught={caught} owned={collection.find((pokemon) => pokemon.dex === browser.selected.dex) ?? null} />
    </div>
  </>;
}

// The grid shows one region at a time; search and filters apply inside it, and changing any of them returns to the first page.
function usePokedexBrowser(caught: ReadonlySet<number>) {
  const displayName = useDisplayName(caught);
  const [region, setRegion] = useState<PokedexRegion>('kanto');
  const [query, search] = useState('');
  const [filter, setFilter] = useState<PokedexFilter>('all');
  const [page, setPage] = useState(0);
  const [selected, select] = useState<PokedexEntry>(pokedex[0]);
  const matches = entriesOfRegion(region).filter((pokemon) => displayName(pokemon).toLocaleLowerCase().includes(query.toLocaleLowerCase()) && matchesFilter(pokemon, filter, caught));
  const changeRegion = (value: PokedexRegion) => { setRegion(value); setPage(0); select(entriesOfRegion(value)[0]!); };
  const changeQuery = (value: string) => { search(value); setPage(0); };
  const changeFilter = (value: PokedexFilter) => { setFilter(value); setPage(0); };
  return { region, query, filter, page, selected, matches, changeRegion, changeQuery, changeFilter, setPage, select };
}

type PokedexGridProps = { matches: readonly PokedexEntry[]; region: PokedexRegion; caught: ReadonlySet<number>; page: number; onPage: (page: number) => void; selected: PokedexEntry; onSelect: (pokemon: PokedexEntry) => void };

function PokedexGrid({ matches, region, caught, page, onPage, selected, onSelect }: PokedexGridProps) {
  const t = useTranslations('Pokedex');
  const regionName = useTranslations('Regions');
  const trainer = useTranslations('Trainer');
  const displayName = useDisplayName(caught);
  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  return <div>
    <ul className="pokedex-grid">{matches.slice(page * pageSize, (page + 1) * pageSize).map((pokemon) => <li key={pokemon.dex}><button type="button" aria-pressed={selected.dex === pokemon.dex} className="pokedex-card" onClick={() => onSelect(pokemon)}>
      <PokemonArt dex={pokemon.dex} silhouette={!caught.has(pokemon.dex)} /><span className="text-sm">{trainer('dex', { number: String(pokemon.dex).padStart(3, '0') })}</span><span className="font-bold">{displayName(pokemon)}</span><span className="text-sm">{t(caught.has(pokemon.dex) ? 'owned' : 'locked')}</span>
    </button></li>)}</ul>
    {matches.length === 0 && <p role="status">{t('empty', { region: regionName(region) })}</p>}
    <div className="flex items-center justify-center gap-4 py-4"><PixelButton variant="secondary" unavailable={page === 0} onClick={() => onPage(page - 1)}>{t('previous')}</PixelButton><p role="status">{t('page', { current: page + 1, total: pages })}</p><PixelButton variant="secondary" unavailable={page + 1 >= pages} onClick={() => onPage(page + 1)}>{t('next')}</PixelButton></div>
  </div>;
}

type PokedexDetailProps = { pokemon: PokedexEntry; caught: ReadonlySet<number>; owned: OwnedPokemon | null };

function PokedexDetail({ pokemon, caught, owned }: PokedexDetailProps) {
  const t = useTranslations('Pokedex');
  const trainer = useTranslations('Trainer');
  const displayName = useDisplayName(caught);
  const isCaught = caught.has(pokemon.dex);
  const previous = pokedex.find((entry) => entry.dex === pokemon.evolvesFrom);
  return <div className="pokedex-detail"><PixelPanel titleId="pokedex-detail-title" title={displayName(pokemon)}>
    <div className="flex justify-center"><PokemonArt dex={pokemon.dex} scale={2} silhouette={!isCaught} /></div>
    {owned && <><p className="font-pixel font-bold">{trainer('level', { level: owned.level })}</p><PokemonProgress pokemon={owned} /></>}
    {!isCaught && <p>{t(unlockHintOf(pokemon))}</p>}
    {isCaught && previous && <p>{t('evolvesFrom', { name: displayName(previous) })}</p>}
    {isCaught && <SpritePreview pokemon={pokemon} />}
  </PixelPanel></div>;
}

function SpritePreview({ pokemon }: { pokemon: PokedexEntry }) {
  const t = useTranslations('Pokedex');
  const [preview, setPreview] = useState(false);
  return <>
    <SpriteMotion showControls={false}><div className="pokedex-sprite-preview"><PokemonSprite species={pokemon.species} scale={2} sizeToFrame action={preview ? 'walk' : 'idle'} animated={preview} direction="east" /></div></SpriteMotion>
    <PixelButton variant="secondary" onClick={() => setPreview(!preview)}>{t(preview ? 'stopPreview' : 'preview')}</PixelButton>
    <p className="text-sm text-muted">{t('previewHint')}</p>
  </>;
}
