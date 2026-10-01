import type { ConfirmationError, PasswordError } from '@/domain/new-password';
import type { SignUpErrors, SignUpField, SignUpFormError, SignUpUsernameError } from './sign-up-state';

export type FieldText = { label: string; hint?: string };

export type SignUpErrorMessages = {
  username: Record<SignUpUsernameError, string>;
  password: Record<PasswordError, string>;
  confirmation: Record<ConfirmationError, string>;
  form: Record<SignUpFormError, string>;
};

export type SignUpFormText = { fields: Record<SignUpField, FieldText>; errors: SignUpErrorMessages; submit: string };

export type SignUpErrorTexts = Partial<Record<SignUpField | 'form', string>>;

export function errorTexts(errors: SignUpErrors, messages: SignUpErrorMessages): SignUpErrorTexts {
  return {
    username: errors.username && messages.username[errors.username],
    password: errors.password && messages.password[errors.password],
    confirmation: errors.confirmation && messages.confirmation[errors.confirmation],
    form: errors.form && messages.form[errors.form],
  };
}
