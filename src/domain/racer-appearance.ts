import type { PokemonSpecies } from '@/assets/pokemon';

export const starterSpecies = ['bulbasaur', 'charmander', 'squirtle', 'pikachu', 'pidgey', 'abra', 'machop', 'geodude', 'gastly', 'dratini'] as const satisfies readonly PokemonSpecies[];

// Cosmetic assignment until persisted starter selection exists. Never a claim of ownership.
// Member keys are shared by both browsers and survive polling, reloads and results sorting.
export function racerSpecies(memberKey: string): (typeof starterSpecies)[number] {
  let hash = 0;
  for (const character of memberKey) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
  return starterSpecies[hash % starterSpecies.length]!;
}
