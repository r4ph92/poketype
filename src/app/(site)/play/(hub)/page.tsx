import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { ProgressBadge } from '@/components/pixel/ProgressBadge';
import { TrainerDashboard } from '@/features/trainer/TrainerDashboard';
import { RoomExitToast } from '@/features/rooms/RoomExitToast';
import { SubmitButton } from '@/components/pixel/SubmitButton';
import { CreateRoomChoice } from '@/features/rooms/access/CreateRoomChoice';
import { JoinWithCodeForm } from '@/features/rooms/access/JoinWithCodeForm';
import { findRace } from '@/features/rooms/find-race';
import { findCurrentTrainer } from '@/features/trainer/current-trainer';
import { findCurrentSession } from '@/server/sessions/current-session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  return { title: t('playTitle') };
}

type PlayPageProps = { searchParams: Promise<{ closed?: string; removed?: string }> };

export default async function PlayPage({ searchParams }: PlayPageProps) {
  const session = await findCurrentSession();
  if (!session) redirect('/');
  const t = await getTranslations('Play');
  const isGuest = session.account === null;
  const { closed, removed } = await searchParams;
  const { RoomAccess } = await getMessages();
  const trainer = await findCurrentTrainer();
  return <>
    {closed === '1' && <RoomExitToast message={t('roomClosed')} dismissLabel={t('dismissMessage')} />}
    {closed === 'idle' && <RoomExitToast message={t('roomClosedIdle')} dismissLabel={t('dismissMessage')} />}
    {removed === 'abandoned' && <RoomExitToast message={t('removedAfterAbandon')} dismissLabel={t('dismissMessage')} />}
    {removed === 'host' && <RoomExitToast message={t('removedByHost')} dismissLabel={t('dismissMessage')} />}
    <TrainerDashboard greeting={t('greeting', { name: session.guest.trainerName })}
    status={isGuest && <ProgressBadge>{t('guestLabel')}</ProgressBadge>}
    raceAction={<>
      <form action={findRace}><SubmitButton label={t('findRace')} /></form>
      <NextIntlClientProvider messages={{ RoomAccess }}><CreateRoomChoice label={t('createRoom')} variant="secondary" /></NextIntlClientProvider>
    </>}
    joinByCode={<NextIntlClientProvider messages={{ RoomAccess }}><JoinWithCodeForm /></NextIntlClientProvider>}
    trainer={trainer} />
  </>;
}
