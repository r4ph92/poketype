'use server';

import { revalidatePath } from 'next/cache';
import { validateTrainerName } from '@/domain/trainer-name';
import { renameTrainer } from '@/server/accounts/rename-trainer';
import { database } from '@/server/db/client';
import { findCurrentSession } from '@/server/sessions/current-session';
import { displayNameFormSchema } from '@/server/validation/account-form-schemas';
import { parseForm } from '@/server/validation/parse-form';
import type { DisplayNameState } from './display-name-state';

// The action names no target: it renames the guest identity of the signed-in session, so another account's name is out of reach.
export async function changeDisplayName(previous: DisplayNameState, formData: FormData): Promise<DisplayNameState> {
  const attempt = previous.attempt + 1;
  const session = await findCurrentSession();
  if (!session?.account) return { error: 'required', saved: false, submittedName: null, attempt };
  const form = parseForm(formData, displayNameFormSchema);
  if (!form) return { error: 'required', saved: false, submittedName: '', attempt };
  const result = validateTrainerName(form.displayName);
  if (!result.ok) return { error: result.error, saved: false, submittedName: form.displayName, attempt };
  await renameTrainer(database, session.guest.id, result.name);
  revalidatePath('/play', 'layout');
  return { error: null, saved: true, submittedName: result.name, attempt };
}
