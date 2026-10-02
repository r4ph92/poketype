'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isEvolutionStoneId } from '@/domain/shop-item';
import type { StoneResult } from '@/domain/stone-evolution';
import { isCanonicalUuid } from '@/domain/uuid';
import { database } from '@/server/db/client';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { evolveWithStone } from '@/server/trainer/evolve-with-stone';

// The server checks the Pokémon is the trainer's, its species and the stone in the bag; the form only names the Pokémon and the stone.
export async function evolveWithStoneAction(submitted: FormData): Promise<StoneResult> {
  const guest = await findCurrentGuest();
  if (!guest) redirect('/');
  const pokemonId = submitted.get('pokemonId');
  const stone = submitted.get('stone');
  if (!isCanonicalUuid(pokemonId) || !isEvolutionStoneId(stone)) return { outcome: 'cannot-use' };
  const result = await evolveWithStone(database, { guestId: guest.id, pokemonId, stone });
  if (result.outcome === 'evolved') revalidatePath('/play', 'layout');
  return result;
}
