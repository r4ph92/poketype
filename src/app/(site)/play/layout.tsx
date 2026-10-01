import { readTrainerAvatar } from '@/server/accounts/trainer-avatar';
import { defaultTrainerAvatar } from '@/assets/trainers';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { PageMain } from '@/components/pixel/PageMain';
import { PixelButton } from '@/components/pixel/PixelButton';
import { DemoTrainerProvider } from '@/features/trainer/DemoTrainerProvider';
import { leaveAsGuest } from '@/features/guest/leave-as-guest';
import { findCurrentSession } from '@/server/sessions/current-session';

export default async function TrainerLayout({ children }: { children: ReactNode }) {
  const session = await findCurrentSession();
  if (!session) redirect('/');
  const avatar = session.account ? await readTrainerAvatar(session.account.id) : null;
  const t = await getTranslations('Trainer');
  const play = await getTranslations('Play');
  const { Trainer, Animation } = await getMessages();
  return <NextIntlClientProvider messages={{ Trainer, Animation }}>
    <DemoTrainerProvider key={session.guest.id} avatar={avatar ?? defaultTrainerAvatar} canChooseTrainer={session.account !== null}>
      <PageMain wide>
        <div className="demo-strip"><span className="font-pixel font-bold">{t('demo')}</span><span>{t('demoHint')}</span></div>
        {children}
        <div className="trainer-bottom"><form action={leaveAsGuest}><PixelButton type="submit" variant="secondary">{play(session.account === null ? 'leave' : 'logOut')}</PixelButton></form></div>
      </PageMain>
    </DemoTrainerProvider>
  </NextIntlClientProvider>;
}
