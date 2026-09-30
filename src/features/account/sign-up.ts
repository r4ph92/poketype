'use server';

import { redirect } from 'next/navigation';
import { openAccount } from '@/server/accounts/account-commands';
import { ConcurrencyGateFullError } from '@/server/accounts/concurrency-gate';
import { hashPassword } from '@/server/accounts/password-hash';
import { isUsernameTaken } from '@/server/accounts/username-availability';
import { database } from '@/server/db/client';
import { findCurrentSession } from '@/server/sessions/current-session';
import { readSessionCookie, writeSessionCookie } from '@/server/sessions/session-cookie';
import type { SignUpErrors, SignUpState } from './sign-up-state';
import { validateSignUp } from './sign-up-validation';

export async function signUp(previous: SignUpState, formData: FormData): Promise<SignUpState> {
  if ((await findCurrentSession())?.account) redirect('/play');
  const refuse = (errors: SignUpErrors) => failedAttempt(previous, formData, errors);
  const form = validateSignUp(formData);
  if (!form.ok) return refuse(form.errors);
  if (await isUsernameTaken(database, form.username)) return refuse({ username: 'taken' });
  const passwordHash = await hashUnlessBusy(form.password);
  if (!passwordHash) return refuse({ form: 'busy' });
  const result = await openAccount(database, { username: form.username, passwordHash }, await readSessionCookie());
  if (result.outcome === 'usernameTaken') return refuse({ username: 'taken' });
  if (result.outcome === 'opened') await writeSessionCookie(result.sessionToken);
  redirect('/play');
}

function failedAttempt(previous: SignUpState, formData: FormData, errors: SignUpErrors): SignUpState {
  const submitted = formData.get('username');
  return { errors, submittedUsername: typeof submitted === 'string' ? submitted : '', attempt: previous.attempt + 1 };
}

async function hashUnlessBusy(password: string): Promise<string | null> {
  try {
    return await hashPassword(password);
  } catch (error) {
    if (error instanceof ConcurrencyGateFullError) return null;
    throw error;
  }
}
