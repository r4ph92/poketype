import { gameConfig } from '@/config/game';

export type PasswordError = 'required' | 'tooShort' | 'tooLong';

export type ConfirmationError = 'required' | 'mismatch';

export type NewPasswordErrors = { password?: PasswordError; confirmation?: ConfirmationError };

export type NewPasswordResult = { ok: true; password: string } | { ok: false; errors: NewPasswordErrors };

const { minLength, maxLength } = gameConfig.account.password;

export function validateNewPassword(
  submittedPassword: FormDataEntryValue | null,
  submittedConfirmation: FormDataEntryValue | null,
): NewPasswordResult {
  const password = normalizedText(submittedPassword);
  const confirmation = normalizedText(submittedConfirmation);
  const errors: NewPasswordErrors = { password: passwordError(password), confirmation: confirmationError(password, confirmation) };
  if (errors.password || errors.confirmation) return { ok: false, errors: withoutEmptyEntries(errors) };
  return { ok: true, password };
}

function normalizedText(submitted: FormDataEntryValue | null): string {
  return typeof submitted === 'string' ? submitted.normalize('NFC') : '';
}

function passwordError(password: string): PasswordError | undefined {
  const codePoints = [...password].length;
  if (codePoints === 0) return 'required';
  if (codePoints < minLength) return 'tooShort';
  if (codePoints > maxLength) return 'tooLong';
  return undefined;
}

function confirmationError(password: string, confirmation: string): ConfirmationError | undefined {
  if (confirmation === '') return 'required';
  if (confirmation !== password) return 'mismatch';
  return undefined;
}

function withoutEmptyEntries(errors: NewPasswordErrors): NewPasswordErrors {
  return Object.fromEntries(Object.entries(errors).filter(([, error]) => error !== undefined));
}
