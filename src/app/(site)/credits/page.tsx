import { getTranslations } from 'next-intl/server';
import { PageMain } from '@/components/pixel/PageMain';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { PokemonSprite } from '@/components/pixel/PokemonSprite';
import { SpriteMotion } from '@/components/pixel/SpriteMotion';
import type { PokemonSpecies } from '@/assets/pokemon';
import { pokemonCredits } from '@/assets/pokemon-credits';
import { trainerSpriteSource } from '@/assets/trainers';
import { pokedex, pokedexRegions, type PokedexRegion } from '@/assets/pokedex';

const wordListSource = { repository: 'https://github.com/hermitdave/FrequencyWords', license: 'https://creativecommons.org/licenses/by-sa/4.0/' } as const;

// A sample of families for the animated gallery, with one starter per later region; the full attribution list follows below it.
const gallerySpecies: readonly PokemonSpecies[] = ['bulbasaur', 'charmander', 'squirtle', 'pikachu', 'pidgey', 'abra', 'machop', 'geodude', 'gastly', 'dratini', 'chikorita', 'treecko', 'turtwig', 'snivy', 'eevee'];

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
            {gallerySpecies.map((species) => (
              <li key={species} className="grid justify-items-center gap-2 border-2 border-slate bg-cream-deep p-3">
                <h2 className="font-pixel text-lg">{speciesName(species)}</h2>
                <div className="flex items-end">
                  <PokemonSprite species={species} scale={1} animated />
                  <PokemonSprite species={species} action="walk" direction="east" scale={1} animated />
                </div>
                <p className="text-sm">{pokemonCredits[species].credit}</p>
                <a className="underline" href={pokemonCredits[species].source}>{t('source')}</a>
              </li>
            ))}
          </ul>
        </SpriteMotion>
        <p>{t('trainers')}</p>
        <a className="underline" href="https://play.pokemonshowdown.com/sprites/trainers/">{t('trainerSource')}</a>
        <a className="underline" href={trainerSpriteSource.repository}>{t('overworldSource')}</a>
        <p>{t('frontArtwork')}</p>
        <details><summary className="min-h-11 cursor-pointer font-pixel">{t('fullCatalog', { count: pokedex.length })}</summary>{pokedexRegions.map((region) => <RegionCredits key={region.id} region={region.id} />)}</details>
        <p>{t('environment')}</p>
        <p>{t('items')}</p>
        <p>{t('words')}</p>
        <a className="underline" href={wordListSource.repository}>{t('wordsSource')}</a>
        <a className="underline" href={wordListSource.license}>{t('wordsLicense')}</a>
      </PixelPanel>
    </PageMain>
  );
}

async function RegionCredits({ region }: { region: PokedexRegion }) {
  const t = await getTranslations('Credits');
  const regionName = await getTranslations('Regions');
  const speciesName = await getTranslations('Pokemon');
  const { firstDex, lastDex } = pokedexRegions.find((range) => range.id === region)!;
  const entries = pokedex.filter((entry) => entry.dex >= firstDex && entry.dex <= lastDex);
  return (
    <section aria-labelledby={`credits-${region}`} className="grid gap-3 py-3">
      <h2 id={`credits-${region}`} className="font-pixel text-lg">{regionName(region)}</h2>
      <ul className="grid gap-3 sm:grid-cols-3">
        {entries.map(({ dex, species }) => (
          <li key={dex}>
            <a href={pokemonCredits[species].source} className="underline">{speciesName(species)}</a>
            <p>{pokemonCredits[species].credit}</p>
            {pokemonCredits[species].animation === 'still' && <p className="text-sm">{t('stillArtwork')}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
