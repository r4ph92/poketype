'use server';

import { redirect } from 'next/navigation';
import { registerAccount } from '@/server/accounts/register-account';
import { database } from '@/server/db/client';
import { findCurrentSession } from '@/server/sessions/current-session';
import { readSessionCookie, writeSessionCookie } from '@/server/sessions/session-cookie';
import { initialSignUpState, type SignUpErrors, type SignUpState } from './sign-up-state';
import { validateSignUp } from './sign-up-validation';

export async function signUp(previousState: unknown, submitted: unknown): Promise<SignUpState> {
  if (!(submitted instanceof FormData)) return initialSignUpState;
  const formData = submitted;
  const previous = isSignUpState(previousState) ? previousState : initialSignUpState;
  if ((await findCurrentSession())?.account) redirect('/play');
  const form = validateSignUp(formData);
  if (!form.ok) return failedAttempt(previous, formData, form.errors);
  const result = await registerAccount(database, { username: form.username, password: form.password, replacedSessionToken: await readSessionCookie() });
  if (result.outcome === 'usernameTaken') return failedAttempt(previous, formData, { username: 'taken' });
  if (result.outcome === 'busy') return failedAttempt(previous, formData, { form: 'busy' });
  if (result.outcome === 'alreadyAccount') return failedAttempt(previous, formData, { form: 'alreadyAccount' });
  await writeSessionCookie(result.sessionToken);
  redirect('/play');
}

function failedAttempt(previous: SignUpState, formData: FormData, errors: SignUpErrors): SignUpState {
  const submitted = formData.get('username');
  return { errors, submittedUsername: typeof submitted === 'string' ? submitted : '', attempt: previous.attempt + 1 };
}

function isSignUpState(value: unknown): value is SignUpState {
  return typeof value === 'object' && value !== null && typeof (value as SignUpState).attempt === 'number';
}
