import { gameConfig } from '@/config/game';
import type { LogInErrors } from './log-in-state';

export type LogInValidation = { ok: true; username: string; password: string } | { ok: false; errors: LogInErrors };

const { username: usernameLimits, password: passwordLimits } = gameConfig.account;

// Only presence and the submitted-size cap are checked: the sign-up rules would tell which names cannot exist, so anything else gets the one generic answer.
export function validateLogIn(formData: FormData): LogInValidation {
  const username = textEntry(formData, 'username');
  const password = textEntry(formData, 'password');
  if (username.trim() === '' || password === '') return { ok: false, errors: missingFieldErrors(username, password) };
  if (username.length > usernameLimits.maxSubmittedLength || password.length > passwordLimits.maxSubmittedLength) {
    return { ok: false, errors: { form: 'invalidCredentials' } };
  }
  return { ok: true, username, password };
}

function textEntry(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

function missingFieldErrors(username: string, password: string): LogInErrors {
  return { ...(username.trim() === '' ? { username: 'required' } : {}), ...(password === '' ? { password: 'required' } : {}) };
}
