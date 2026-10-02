import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PageMain } from '@/components/pixel/PageMain';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { parseRoomId } from '@/domain/room-id';
import { loadLogInFormText } from '@/features/account/load-log-in-form-text';
import { LogInForm } from '@/features/account/LogInForm';
import { findCurrentSession } from '@/server/sessions/current-session';

type LogInPageProps = { searchParams: Promise<{ room?: string | string[] }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  return { title: t('logInTitle') };
}

export default async function LogInPage({ searchParams }: LogInPageProps) {
  if ((await findCurrentSession())?.account) redirect('/play');
  const returnRoomId = parseRoomId((await searchParams).room);
  const t = await getTranslations('LogIn');
  const accountBar = await getTranslations('AccountBar');
  return (
    <PageMain>
      <PixelPanel titleId="login-title" level={1} title={t('heading')}>
        <p className="max-w-[65ch]">{t('intro')}</p>
        <LogInForm text={await loadLogInFormText()} returnRoomId={returnRoomId} />
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
