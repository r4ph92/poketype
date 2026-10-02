import { racerPortraits } from '@/assets/racer-portraits';
import type { PokemonSpecies } from '@/assets/pokemon';

// Crop the transparent canvas in the viewBox, preserving the original artwork.
export function RacePokemonPortrait({ species }: { species: PokemonSpecies }) {
  const { dex, x, y, width, height } = racerPortraits[species];
  return <svg aria-hidden="true" className="race-pokemon-portrait" viewBox={`${x} ${y} ${width} ${height}`} width={width * 3} height={height * 3}>
    <image href={`/assets/sprites/pokemon/front/${dex}.png`} width="96" height="96" />
  </svg>;
}
