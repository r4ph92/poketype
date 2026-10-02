import { levelEvolutions, type LevelEvolution } from '@/assets/level-evolutions';
import type { PokedexDex } from '@/assets/pokedex';

const evolutionsByForm = new Map<number, LevelEvolution>(levelEvolutions.map((evolution) => [evolution.from, evolution]));

// Takes every level evolution the level allows, even into a species the trainer already owns.
export function evolvedFormAt(dex: PokedexDex, level: number): PokedexDex {
  const evolution = evolutionsByForm.get(dex);
  if (!evolution || level < evolution.level) return dex;
  return evolvedFormAt(evolution.into, level);
}

