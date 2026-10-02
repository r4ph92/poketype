'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { pokedex } from '@/assets/pokedex';
import { legendaryRewards } from '@/config/achievements';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { PixelButton } from '@/components/pixel/PixelButton';
import { PokemonSprite } from '@/components/pixel/PokemonSprite';
import { SpriteMotion } from '@/components/pixel/SpriteMotion';
import { PokemonArt } from './PokemonArt';
import type { OwnedPokemon } from '@/domain/trainer-profile';
import { PokemonProgress } from './PartnerCard';

const pageSize = 24;
const legends = new Set<number>(legendaryRewards.map((reward) => reward.dex));
export function PokedexView({ collection }: { collection: readonly OwnedPokemon[] }) {
  const t = useTranslations('Pokedex');
  const trainer = useTranslations('Trainer');
  const owned = new Set<number>(collection.map((pokemon) => pokemon.dex));
  const caughtCount = pokedex.filter((pokemon) => owned.has(pokemon.dex)).length;
  const name = useTranslations('Pokemon');
  const [query, search] = useState('');
  const [filter, setFilter] = useState<'all' | 'owned' | 'evolutions' | 'legendary'>('all');
  const [page, setPage] = useState(0);
  const [selected, select] = useState<(typeof pokedex)[number]>(pokedex[0]);
  const [preview, setPreview] = useState(false);
  const displayName = (pokemon: (typeof pokedex)[number]) => owned.has(pokemon.dex) ? name(pokemon.species) : t('unknownName');
  const selectedPokemon = collection.find((pokemon) => pokemon.dex === selected.dex);
  const selectedOwned = Boolean(selectedPokemon);
  const matches = pokedex.filter((pokemon) => displayName(pokemon).toLocaleLowerCase().includes(query.toLocaleLowerCase()) && (filter === 'all' || (filter === 'owned' && owned.has(pokemon.dex)) || (filter === 'evolutions' && pokemon.evolvesFrom !== null) || (filter === 'legendary' && legends.has(pokemon.dex))));
  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  return <>
    <PixelPanel titleId="pokedex-title" level={1} title={t('title')} meta={t('caughtProgress', { count: caughtCount, total: pokedex.length })}>
      <p>{t('intro')}</p>
      <progress className="h-4 w-full accent-ink" value={caughtCount} max={pokedex.length} aria-label={t('caughtProgress', { count: caughtCount, total: pokedex.length })} />
      <div className="flex flex-wrap gap-3"><Link href="/play/collection" className="min-h-11 inline-flex items-center underline">{t('collection')}</Link><Link href="/play/achievements" className="min-h-11 inline-flex items-center underline">{t('achievements')}</Link></div>
      <div className="flex flex-wrap gap-3"><input aria-label={t('search')} placeholder={t('search')} value={query} onChange={(event) => { search(event.target.value); setPage(0); }} className="min-h-11 border-2 border-frame bg-cream-deep p-2" /><div className="flex flex-wrap gap-2" role="group" aria-label={t('filters')}>{(['all', 'owned', 'evolutions', 'legendary'] as const).map((value) => <button type="button" key={value} aria-pressed={filter === value} className="storage-filter" onClick={() => { setFilter(value); setPage(0); }}>{t(value)}</button>)}</div></div>
    </PixelPanel>
    <div className="pokedex-layout">
      <div>
        <ul className="pokedex-grid">{matches.slice(page * pageSize, (page + 1) * pageSize).map((pokemon) => <li key={pokemon.dex}><button type="button" aria-pressed={selected.dex === pokemon.dex} className="pokedex-card" onClick={() => { select(pokemon); setPreview(false); }}>
          <PokemonArt dex={pokemon.dex} silhouette={!owned.has(pokemon.dex)} /><span className="text-sm">{trainer('dex', { number: String(pokemon.dex).padStart(3, '0') })}</span><span className="font-bold">{displayName(pokemon)}</span><span className="text-sm">{t(owned.has(pokemon.dex) ? 'owned' : 'locked')}</span>
        </button></li>)}</ul>
        {matches.length === 0 && <p role="status">{t('empty')}</p>}
        <div className="flex items-center justify-center gap-4 py-4"><PixelButton variant="secondary" unavailable={page === 0} onClick={() => setPage(page - 1)}>{t('previous')}</PixelButton><p role="status">{t('page', { current: page + 1, total: pages })}</p><PixelButton variant="secondary" unavailable={page + 1 >= pages} onClick={() => setPage(page + 1)}>{t('next')}</PixelButton></div>
      </div>
      <div className="pokedex-detail"><PixelPanel titleId="pokedex-detail-title" title={displayName(selected)}>
        <div className="flex justify-center"><PokemonArt dex={selected.dex} scale={2} silhouette={!selectedOwned} /></div>
        {selectedPokemon && <><p className="font-pixel font-bold">{trainer('level', { level: selectedPokemon.level })}</p><PokemonProgress pokemon={selectedPokemon} /></>}
        {!selectedOwned && <p>{t(legends.has(selected.dex) ? 'legendaryUnlock' : selected.evolvesFrom !== null ? 'evolutionUnlock' : [1, 4, 7].includes(selected.dex) ? 'starterUnlock' : 'encounterUnlock')}</p>}
        {selectedOwned && selected.evolvesFrom !== null && <p>{t('evolvesFrom', { name: displayName(pokedex.find((pokemon) => pokemon.dex === selected.evolvesFrom)!) })}</p>}
        {selectedOwned && <><SpriteMotion showControls={false}><div className="pokedex-sprite-preview"><PokemonSprite species={selected.species} scale={2} sizeToFrame action={preview ? 'walk' : 'idle'} animated={preview} direction="east" /></div></SpriteMotion>
        <PixelButton variant="secondary" onClick={() => setPreview(!preview)}>{t(preview ? 'stopPreview' : 'preview')}</PixelButton>
        <p className="text-sm text-muted">{t('previewHint')}</p></>}
      </PixelPanel></div>
    </div>
  </>;
}
