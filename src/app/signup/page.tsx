import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { loadSignUpFormText } from '@/features/account/load-sign-up-form-text';
import { SignUpForm } from '@/features/account/SignUpForm';
import { SignUpNotice } from '@/features/account/SignUpNotice';
import { findCurrentSession } from '@/server/sessions/current-session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  return { title: t('signUpTitle') };
}

export default async function SignUpPage() {
  if ((await findCurrentSession())?.account) redirect('/play');
  const t = await getTranslations('SignUp');
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold sm:text-4xl">{t('heading')}</h1>
      <SignUpNotice />
      <SignUpForm text={await loadSignUpFormText()} />
    </main>
  );
}
