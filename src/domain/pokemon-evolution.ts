import { levelEvolutions, type LevelEvolution } from '@/assets/level-evolutions';
import type { PokedexDex } from '@/assets/pokedex';
import { gameConfig } from '@/config/game';
import { pickOne, type RandomSource } from './random-source';

const { friendshipLevel, moveLevel, locationLevel } = gameConfig.evolution;

const evolutionsByForm = new Map<number, LevelEvolution[]>();
for (const evolution of levelEvolutions) evolutionsByForm.set(evolution.from, [...(evolutionsByForm.get(evolution.from) ?? []), evolution]);

export function requiredLevel(evolution: LevelEvolution): number {
  if (evolution.trigger === 'level') return evolution.level;
  if (evolution.trigger === 'friendship') return friendshipLevel;
  return evolution.trigger === 'move' ? moveLevel : locationLevel;
}

// Takes every level evolution the level allows, even into a species the trainer already owns.
// When several are reached at once (Wurmple, Burmy, an Eevee that used no stone), the server's random source picks one.
export function evolvedFormAt(dex: PokedexDex, level: number, random: RandomSource): PokedexDex {
  const reached = (evolutionsByForm.get(dex) ?? []).filter((evolution) => level >= requiredLevel(evolution));
  if (reached.length === 0) return dex;
  return evolvedFormAt(pickOne(reached, random).into, level, random);
}
