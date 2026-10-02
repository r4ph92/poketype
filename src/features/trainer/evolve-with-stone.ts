'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { parsePokedexDex } from '@/domain/pokemon-catalog';
import { isEvolutionStoneId } from '@/domain/shop-item';
import type { StoneResult } from '@/domain/stone-evolution';
import { database } from '@/server/db/client';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { evolveWithStone } from '@/server/trainer/evolve-with-stone';

// The server checks the species, the stone in the bag and the evolved form already owned; the form only names the Pokémon and the stone.
export async function evolveWithStoneAction(submitted: FormData): Promise<StoneResult> {
  const guest = await findCurrentGuest();
  if (!guest) redirect('/');
  const dex = parsePokedexDex(submitted.get('dex'));
  const stone = submitted.get('stone');
  if (dex === null || !isEvolutionStoneId(stone)) return { outcome: 'cannot-use' };
  const result = await evolveWithStone(database, { guestId: guest.id, dex, stone });
  if (result.outcome === 'evolved') revalidatePath('/play', 'layout');
  return result;
}
