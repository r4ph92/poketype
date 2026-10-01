'use server';

import { redirect } from 'next/navigation';
import { parseRoomId } from '@/domain/room-id';
import { destinationAfterEntry } from '@/features/guest/entry-destination';
import { logInWithPassword, type LogInResult } from '@/server/accounts/log-in';
import { database } from '@/server/db/client';
import { findCurrentSession } from '@/server/sessions/current-session';
import { readSessionCookie, writeSessionCookie } from '@/server/sessions/session-cookie';
import { initialLogInState, type LogInErrors, type LogInFormError, type LogInState } from './log-in-state';
import { validateLogIn } from './log-in-validation';

type RefusedOutcome = Exclude<LogInResult['outcome'], 'loggedIn'>;

const formErrorOf: Record<RefusedOutcome, LogInFormError> = { invalid: 'invalidCredentials', throttled: 'throttled', busy: 'busy' };

export async function logIn(previousState: unknown, submitted: unknown): Promise<LogInState> {
  if (!(submitted instanceof FormData)) return initialLogInState;
  const previous = isLogInState(previousState) ? previousState : initialLogInState;
  if ((await findCurrentSession())?.account) redirect('/play');
  const form = validateLogIn(submitted);
  if (!form.ok) return failedAttempt(previous, submitted, form.errors);
  const result = await logInWithPassword(database, { username: form.username, password: form.password, presentedSessionToken: await readSessionCookie() });
  if (result.outcome !== 'loggedIn') return failedAttempt(previous, submitted, { form: formErrorOf[result.outcome] });
  await writeSessionCookie(result.sessionToken);
  redirect(destinationAfterEntry(parseRoomId(submitted.get('returnRoomId'))));
}

function failedAttempt(previous: LogInState, formData: FormData, errors: LogInErrors): LogInState {
  const submitted = formData.get('username');
  return { errors, submittedUsername: typeof submitted === 'string' ? submitted : '', attempt: previous.attempt + 1 };
}

function isLogInState(value: unknown): value is LogInState {
  return typeof value === 'object' && value !== null && typeof (value as LogInState).attempt === 'number';
}
