'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { PixelButton } from '@/components/pixel/PixelButton';
import { type DemoPokemon, type PokemonType } from './demo-profile';
import { useDemoTrainer } from './DemoTrainerProvider';
import { PokemonArt } from './PokemonArt';
import { EvolutionChain, PokemonProgress } from './PartnerCard';

export function PcStorage({ equippedDex, onEquip }: { equippedDex: number; onEquip: (pokemon: DemoPokemon) => void }) {
  const t = useTranslations('Trainer');
  const { collection } = useDemoTrainer();
  const [selected, setSelected] = useState<DemoPokemon>(collection.find((pokemon) => pokemon.dex === equippedDex)!);
  const [filter, setFilter] = useState<PokemonType | 'all'>('all');
  const [search, setSearch] = useState('');
  const nameOf = (pokemon: DemoPokemon) => t(`species.${pokemon.dex}`);
  const visible = collection.filter((pokemon) => (filter === 'all' || pokemon.type === filter) && nameOf(pokemon).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return (
    <div id="pc-storage" className="pc-layout scroll-mt-4">
      <PixelPanel titleId="storage-title" level={1} title={t('storage')} meta={t('collected', { count: collection.length })}>
        <div className="storage-tools">
          <div role="group" aria-label={t('filterLabel')} className="flex flex-wrap gap-2">
            {(['all', 'fire', 'water', 'grass'] as const).map((type) => <button key={type} type="button" aria-pressed={filter === type} onClick={() => setFilter(type)} className={`storage-filter type-${type}`}>{t(`types.${type}`)}</button>)}
          </div>
          <input aria-label={t('search')} placeholder={t('search')} value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-11 min-w-0 border-2 border-slate bg-cream-deep px-3" />
        </div>
        <div className="storage-box">
          <ul className="pokemon-grid">
            {visible.map((pokemon) => <li key={pokemon.dex}>
              <button type="button" aria-label={t('inspect', { name: nameOf(pokemon) })} aria-pressed={selected.dex === pokemon.dex} onClick={() => setSelected(pokemon)} className="pokemon-slot">
                <span className="slot-status">{equippedDex === pokemon.dex ? t('active') : nameOf(pokemon)}</span>
                <PokemonArt dex={pokemon.dex} />
                <span className="slot-level">{t('level', { level: pokemon.level })}</span>
              </button>
            </li>)}
            {filter === 'all' && !search && [1, 2, 3].map((slot) => <li key={`locked-${slot}`} className="pokemon-slot locked-slot" aria-label={t('undiscovered')}><span aria-hidden="true">{t('unknown')}</span></li>)}
          </ul>
          {visible.length === 0 && <p className="p-4" role="status">{t('noPokemon')}</p>}
          <p className="box-label font-pixel font-bold">{t('box')}</p>
        </div>
      </PixelPanel>
      <PixelPanel titleId="storage-detail" title={nameOf(selected)} meta={t('dex', { number: selected.dex.toString().padStart(3, '0') })}>
        <div className="storage-detail-art"><span className={`type-chip type-${selected.type}`}>{t(`types.${selected.type}`)}</span><PokemonArt dex={selected.dex} scale={2} /></div>
        <p className="font-pixel text-lg font-bold">{t('level', { level: selected.level })}</p>
        <PokemonProgress pokemon={selected} />
        <EvolutionChain pokemon={selected} />
        <dl className="pokemon-record">
          {[['races', selected.races], ['wins', selected.wins], ['bestWpm', selected.bestWpm]].map(([key, value]) => <div key={key}><dt>{t(key as 'races' | 'wins' | 'bestWpm')}</dt><dd>{value}</dd></div>)}
        </dl>
        <PixelButton variant="secondary" onClick={() => onEquip(selected)}>{t(equippedDex === selected.dex ? 'equipped' : 'equip')}</PixelButton>
        <p className="text-sm text-muted">{t('demoSelection')}</p>
      </PixelPanel>
    </div>
  );
}
