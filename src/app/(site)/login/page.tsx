import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PageMain } from '@/components/pixel/PageMain';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { parseOAuthNotice } from '@/domain/oauth-notice';
import { loadLogInFormText } from '@/features/account/load-log-in-form-text';
import { LogInForm } from '@/features/account/LogInForm';
import { OAuthButtons } from '@/features/account/OAuthButtons';
import { OAuthNoticeBox } from '@/features/account/OAuthNoticeBox';
import { entryReturnDestination } from '@/features/guest/entry-destination';
import { findCurrentSession } from '@/server/sessions/current-session';

type LogInPageProps = { searchParams: Promise<{ room?: string | string[]; invite?: string | string[]; oauth?: string | string[] }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  return { title: t('logInTitle') };
}

export default async function LogInPage({ searchParams }: LogInPageProps) {
  if ((await findCurrentSession())?.account) redirect('/play');
  const { room, invite, oauth } = await searchParams;
  const returnTo = entryReturnDestination({ returnRoomId: room, inviteToken: invite });
  const notice = parseOAuthNotice(oauth);
  const t = await getTranslations('LogIn');
  const accountBar = await getTranslations('AccountBar');
  return (
    <PageMain>
      <PixelPanel titleId="login-title" level={1} title={t('heading')}>
        <p className="max-w-[65ch]">{t('intro')}</p>
        {notice && <OAuthNoticeBox notice={notice} />}
        <LogInForm text={await loadLogInFormText()} returnTo={returnTo} />
        <OAuthButtons returnTo={returnTo} />
        <p>
          {t('noAccount')}{' '}
          <Link href="/signup" className="font-semibold underline">
            {accountBar('signUp')}
          </Link>
        </p>
      </PixelPanel>
    </PageMain>
  );
}
