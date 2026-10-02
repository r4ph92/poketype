import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PageMain } from '@/components/pixel/PageMain';
import { PixelPanel } from '@/components/pixel/PixelPanel';
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
  const accountBar = await getTranslations('AccountBar');
  return (
    <PageMain>
      <PixelPanel titleId="signup-title" level={1} title={t('heading')}>
        <SignUpNotice />
        <SignUpForm text={await loadSignUpFormText()} />
        <p>
          {t('haveAccount')}{' '}
          <Link href="/login" className="font-semibold underline">
            {accountBar('logIn')}
          </Link>
        </p>
      </PixelPanel>
    </PageMain>
  );
}
