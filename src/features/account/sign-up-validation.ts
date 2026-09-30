import { validateNewPassword } from '@/domain/new-password';
import { validateUsername } from '@/domain/username';
import type { SignUpErrors } from './sign-up-state';

export type SignUpValidation = { ok: true; username: string; password: string } | { ok: false; errors: SignUpErrors };

export function validateSignUp(formData: FormData): SignUpValidation {
  const username = validateUsername(formData.get('username'));
  const password = validateNewPassword(formData.get('password'), formData.get('confirmation'));
  if (username.ok && password.ok) return { ok: true, username: username.username, password: password.password };
  const usernameErrors = username.ok ? {} : { username: username.error };
  return { ok: false, errors: { ...usernameErrors, ...(password.ok ? {} : password.errors) } };
}
