'use client';
import { useTranslations } from 'next-intl';
import type { PokedexDex } from '@/assets/pokedex';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { evolutionLineOf } from '@/domain/pokemon-catalog';
import { xpToNextLevel } from '@/domain/pokemon-level';
import type { OwnedPokemon } from '@/domain/trainer-profile';
import { PokemonArt } from './PokemonArt';
import { UnknownPokemonArt } from './UnknownPokemonArt';

export function PokemonProgress({ pokemon }: { pokemon: Pick<OwnedPokemon, 'level' | 'xp'> }) {
  const t = useTranslations('Trainer');
  const total = xpToNextLevel(pokemon.level);
  if (total === null) return <p className="font-pixel font-bold">{t('maxLevel')}</p>;
  return (
    <div className="pokemon-progress">
      <div className="flex items-center justify-between gap-2"><span className="font-pixel font-bold">{t('xp')}</span><span className="text-sm">{t('xpAmount', { current: pokemon.xp, total })}</span></div>
      <div className="xp-track" aria-hidden="true"><div style={{ width: `${Math.min(100, (pokemon.xp / total) * 100)}%` }} /></div>
      <p className="text-sm">{t('nextLevel', { xp: total - pokemon.xp, level: pokemon.level + 1 })}</p>
    </div>
  );
}

// Forms the trainer does not own yet stay hidden as "?".
export function EvolutionChain({ dex, ownedDexes }: { dex: PokedexDex; ownedDexes: ReadonlySet<number> }) {
  const t = useTranslations('Trainer');
  return (
    <div className="evolution-chain">
      <div className="evolution-forms">
        {evolutionLineOf(dex).map((form, index) => <div className="evolution-form" key={form}>
          {index > 0 && <span aria-hidden="true" className="evolution-arrow">{t('arrow')}</span>}
          {ownedDexes.has(form) ? <PokemonArt dex={form} /> : <UnknownPokemonArt />}
        </div>)}
      </div>
    </div>
  );
}

export function PartnerCard({ pokemon, ownedDexes }: { pokemon: OwnedPokemon; ownedDexes: ReadonlySet<number> }) {
  const t = useTranslations('Trainer');
  return (
    <PixelPanel titleId="partner-title" title={t('partner')}>
      <div className="partner-overview">
        <div className="partner-art"><PokemonArt dex={pokemon.dex} scale={3} /></div>
        <div className="grid content-center gap-2">
          <h3 className="font-pixel text-xl font-bold">{t(`species.${pokemon.dex}`)}</h3>
          <p className="font-pixel text-lg">{t('level', { level: pokemon.level })}</p>
          <PokemonProgress pokemon={pokemon} />
        </div>
      </div>
      <EvolutionChain dex={pokemon.dex} ownedDexes={ownedDexes} />
    </PixelPanel>
  );
}
