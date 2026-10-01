import { getTranslations } from 'next-intl/server';
import { PageMain } from '@/components/pixel/PageMain';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { PokemonSprite } from '@/components/pixel/PokemonSprite';
import { SpriteMotion } from '@/components/pixel/SpriteMotion';
import { starterSpecies } from '@/domain/racer-appearance';
import { trainerSpriteSource } from '@/assets/trainers';
import { pokedex } from '@/assets/pokedex';
import { pokemonArtwork } from '@/assets/pokemon';

export default async function CreditsPage() {
  const t = await getTranslations('Credits');
  const speciesName = await getTranslations('Pokemon');
  return (
    <PageMain wide>
      <PixelPanel titleId="credits-title" level={1} title={t('title')}>
        <p>{t('intro')}</p>
        <p>{t('official')}</p>
        <SpriteMotion>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {starterSpecies.map((species) => (
              <li key={species} className="grid justify-items-center gap-2 border-2 border-slate bg-cream-deep p-3">
                <h2 className="font-pixel text-lg">{speciesName(species)}</h2>
                <div className="flex items-end">
                  <PokemonSprite species={species} scale={1} animated />
                  <PokemonSprite species={species} action="walk" direction="east" scale={1} animated />
                </div>
                <p className="text-sm">{pokemonArtwork[species].credit}</p>
                <a className="underline" href={pokemonArtwork[species].source}>{t('source')}</a>
              </li>
            ))}
          </ul>
        </SpriteMotion>
        <p>{t('trainers')}</p>
        <a className="underline" href="https://play.pokemonshowdown.com/sprites/trainers/">{t('trainerSource')}</a>
        <a className="underline" href={trainerSpriteSource.repository}>{t('overworldSource')}</a>
        <details><summary className="min-h-11 cursor-pointer font-pixel">{t('fullCatalog')}</summary><ul className="grid gap-3 sm:grid-cols-3">{pokedex.map((entry) => <li key={entry.dex}><a href={pokemonArtwork[entry.species].source} className="underline">{speciesName(entry.species)}</a><p>{pokemonArtwork[entry.species].credit}</p></li>)}</ul></details>
        <p>{t('environment')}</p>
      </PixelPanel>
    </PageMain>
  );
}
