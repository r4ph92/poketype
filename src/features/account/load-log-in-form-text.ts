import 'server-only';
import { getTranslations } from 'next-intl/server';
import { gameConfig } from '@/config/game';
import type { LogInFormText } from './log-in-form-text';

export async function loadLogInFormText(): Promise<LogInFormText> {
  const t = await getTranslations('LogIn');
  const signUp = await getTranslations('SignUp');
  return {
    fields: { username: { label: signUp('usernameLabel') }, password: { label: signUp('passwordLabel') } },
    errors: {
      required: { username: t('errors.username.required'), password: t('errors.password.required') },
      form: {
        invalidCredentials: t('errors.form.invalidCredentials'),
        throttled: t('errors.form.throttled', { minutes: gameConfig.account.loginThrottle.lockMinutes }),
        busy: t('errors.form.busy'),
      },
    },
    submit: t('submit'),
  };
}
