import type { ConfirmationError, PasswordError } from '@/domain/new-password';
import type { UsernameError } from '@/domain/username';

export type SignUpUsernameError = UsernameError | 'taken';

export type SignUpFormError = 'busy' | 'alreadyAccount';

export type SignUpErrors = {
  username?: SignUpUsernameError;
  password?: PasswordError;
  confirmation?: ConfirmationError;
  form?: SignUpFormError;
};

export type SignUpField = 'username' | 'password' | 'confirmation';

export const signUpFields: readonly SignUpField[] = ['username', 'password', 'confirmation'];

export type SignUpState = { errors: SignUpErrors; submittedUsername: string; attempt: number };

export const initialSignUpState: SignUpState = { errors: {}, submittedUsername: '', attempt: 0 };
