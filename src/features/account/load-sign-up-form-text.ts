import 'server-only';
import { getTranslations } from 'next-intl/server';
import { gameConfig } from '@/config/game';
import type { SignUpFormText } from './sign-up-form-text';

const { username, password } = gameConfig.account;

export async function loadSignUpFormText(): Promise<SignUpFormText> {
  const t = await getTranslations('SignUp');
  return {
    fields: {
      username: { label: t('usernameLabel'), hint: t('usernameHint', { min: username.minLength, max: username.maxLength }) },
      password: { label: t('passwordLabel'), hint: t('passwordHint', { min: password.minLength }) },
      confirmation: { label: t('confirmationLabel') },
    },
    errors: {
      username: {
        required: t('errors.username.required'),
        length: t('errors.username.length', { min: username.minLength, max: username.maxLength }),
        characters: t('errors.username.characters'),
        taken: t('errors.username.taken'),
      },
      password: {
        required: t('errors.password.required'),
        tooShort: t('errors.password.tooShort', { min: password.minLength }),
        tooLong: t('errors.password.tooLong', { max: password.maxLength }),
      },
      confirmation: { required: t('errors.confirmation.required'), mismatch: t('errors.confirmation.mismatch') },
      form: { busy: t('errors.form.busy') },
    },
    submit: t('submit'),
  };
}
