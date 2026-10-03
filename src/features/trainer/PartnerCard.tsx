'use client';
import { useTranslations } from 'next-intl';
import type { PokedexDex } from '@/assets/pokedex';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { evolutionTreeOf, isLinearEvolution, type EvolutionNode } from '@/domain/pokemon-catalog';
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

type EvolutionFormsProps = { node: EvolutionNode; caughtDexes: ReadonlySet<number> };

// Forms the trainer has not caught yet stay hidden as "?"; a form a Pokémon evolved from stays shown.
// A straight family reads left to right; a branching one (Eevee, Oddish, Wurmple…) hangs each branch under its parent.
export function EvolutionChain({ dex, caughtDexes }: { dex: PokedexDex; caughtDexes: ReadonlySet<number> }) {
  const tree = evolutionTreeOf(dex);
  return (
    <div className="evolution-chain">
      {isLinearEvolution(tree) ? <EvolutionRow node={tree} caughtDexes={caughtDexes} /> : <EvolutionBranch node={tree} caughtDexes={caughtDexes} />}
    </div>
  );
}

function EvolutionRow({ node, caughtDexes }: EvolutionFormsProps) {
  const t = useTranslations('Trainer');
  return (
    <div className="evolution-forms">
      {straightLineOf(node).map((form, index) => <div className="evolution-form" key={form}>
        {index > 0 && <span aria-hidden="true" className="evolution-arrow">{t('arrow')}</span>}
        <EvolutionFormArt dex={form} caughtDexes={caughtDexes} />
      </div>)}
    </div>
  );
}

function EvolutionBranch({ node, caughtDexes }: EvolutionFormsProps) {
  const t = useTranslations('Trainer');
  return (
    <div className="evolution-branch">
      <div className="evolution-form"><EvolutionFormArt dex={node.dex} caughtDexes={caughtDexes} /></div>
      {node.evolutions.length > 0 && <>
        <span aria-hidden="true" className="evolution-arrow-down">{t('arrow')}</span>
        <div className="evolution-branches">
          {node.evolutions.map((evolution) => <EvolutionBranch key={evolution.dex} node={evolution} caughtDexes={caughtDexes} />)}
        </div>
      </>}
    </div>
  );
}

function EvolutionFormArt({ dex, caughtDexes }: { dex: PokedexDex; caughtDexes: ReadonlySet<number> }) {
  return caughtDexes.has(dex) ? <PokemonArt dex={dex} /> : <UnknownPokemonArt />;
}

function straightLineOf(node: EvolutionNode): PokedexDex[] {
  const [next] = node.evolutions;
  return next ? [node.dex, ...straightLineOf(next)] : [node.dex];
}

export function PartnerCard({ pokemon, caughtDexes }: { pokemon: OwnedPokemon; caughtDexes: ReadonlySet<number> }) {
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
      <EvolutionChain dex={pokemon.dex} caughtDexes={caughtDexes} />
    </PixelPanel>
  );
}
