'use client';
import { useTranslations } from 'next-intl';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { PokemonArt } from './PokemonArt';
import { UnknownPokemonArt } from './UnknownPokemonArt';
import { useDemoTrainer } from './DemoTrainerProvider';
import type { DemoPokemon } from './demo-profile';

export function PokemonProgress({ pokemon }: { pokemon: DemoPokemon }) {
  const t = useTranslations('Trainer');
  return (
    <div className="pokemon-progress">
      <div className="flex items-center justify-between gap-2"><span className="font-pixel font-bold">{t('xp')}</span><span className="text-sm">{t('xpAmount', { current: pokemon.xp, total: pokemon.nextLevelXp })}</span></div>
      <div className={`xp-track type-${pokemon.type}`} aria-hidden="true"><div style={{ width: `${Math.min(100, pokemon.xp / pokemon.nextLevelXp * 100)}%` }} /></div>
      <p className="text-sm">{t('nextLevel', { xp: pokemon.nextLevelXp - pokemon.xp, level: pokemon.level + 1 })}</p>
    </div>
  );
}
export function EvolutionChain({ pokemon }: { pokemon: DemoPokemon }) {
  const { collection } = useDemoTrainer();
  const t = useTranslations('Trainer');
  return (
    <div className="evolution-chain">
      <div className="evolution-forms">
        {pokemon.evolution.map((form, index) => <div className="evolution-form" key={form.dex}>
          {index > 0 && <span aria-hidden="true" className="evolution-arrow">{t('arrow')}</span>}
          {collection.some((owned) => owned.dex === form.dex) ? <PokemonArt dex={form.dex} /> : <UnknownPokemonArt />}
          <span className="text-sm">{t('level', { level: form.level ?? pokemon.level })}</span>
        </div>)}
      </div>
      <p className="text-sm font-bold">{t('evolvesAt', { level: pokemon.evolution[1]?.level ?? pokemon.level })}</p>
    </div>
  );
}
export function PartnerCard({ pokemon }: { pokemon: DemoPokemon }) {
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
      <EvolutionChain pokemon={pokemon} />
    </PixelPanel>
  );
}
