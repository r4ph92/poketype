import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { PageMain } from '@/components/pixel/PageMain';
import { PixelButton } from '@/components/pixel/PixelButton';
import { EndSessionForm } from '@/features/account/EndSessionForm';
import { findCurrentSession } from '@/server/sessions/current-session';

export default async function TrainerLayout({ children }: { children: ReactNode }) {
  const session = await findCurrentSession();
  if (!session) redirect('/');
  const play = await getTranslations('Play');
  const { Trainer, Animation } = await getMessages();
  return <NextIntlClientProvider messages={{ Trainer, Animation }}>
    <PageMain wide>
      {children}
      {session.account === null && <div className="trainer-bottom"><EndSessionForm><PixelButton type="submit" variant="secondary">{play('leave')}</PixelButton></EndSessionForm></div>}
    </PageMain>
  </NextIntlClientProvider>;
}
