import { pokemonSprites, type PokemonSpecies } from '@/assets/pokemon';

// Reads the sprite list rather than the Pokédex, so pages that only draw Pokémon (rooms, results) never load the catalog.
export function isPokemonSpecies(value: unknown): value is PokemonSpecies {
  return typeof value === 'string' && Object.hasOwn(pokemonSprites, value);
}
