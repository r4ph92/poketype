'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { isTrainerAvatar } from '@/assets/trainers';
import { database } from '@/server/db/client';
import { users } from '@/server/db/schema';
import { findCurrentSession } from '@/server/sessions/current-session';

export async function saveTrainer(_previous: { invalid: boolean }, data: FormData): Promise<{ invalid: boolean }> {
  const session = await findCurrentSession();
  if (!session?.account) redirect('/signup');
  const avatar = data.get('avatar');
  if (!isTrainerAvatar(avatar)) return { invalid: true };
  await database.update(users).set({ trainerAvatar: avatar }).where(eq(users.id, session.account.id));
  revalidatePath('/play', 'layout');
  redirect('/play/choose-starter');
}
