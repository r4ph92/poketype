import { levelEvolutions, type LevelEvolution } from '@/assets/level-evolutions';
import type { PokedexDex } from '@/assets/pokedex';

const evolutionsByForm = new Map<number, LevelEvolution>(levelEvolutions.map((evolution) => [evolution.from, evolution]));

// Takes every level evolution the level allows. A collection holds one Pokémon per species, so a form the trainer already owns is skipped and the Pokémon stays as it is.
export function evolvedFormAt(dex: PokedexDex, level: number, ownedDexes: ReadonlySet<number>): PokedexDex {
  const evolution = evolutionsByForm.get(dex);
  if (!evolution || level < evolution.level || ownedDexes.has(evolution.into)) return dex;
  return evolvedFormAt(evolution.into, level, ownedDexes);
}

