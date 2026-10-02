import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { ProgressBadge } from '@/components/pixel/ProgressBadge';
import { TrainerDashboard } from '@/features/trainer/TrainerDashboard';
import { RoomClosedNotice } from '@/features/rooms/RoomClosedNotice';
import { RoomClosedToast } from '@/features/rooms/RoomClosedToast';
import { SubmitButton } from '@/components/pixel/SubmitButton';
import { createRoom } from '@/features/rooms/create-room';
import { findRace } from '@/features/rooms/find-race';
import { findCurrentSession } from '@/server/sessions/current-session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  return { title: t('playTitle') };
}

type PlayPageProps = { searchParams: Promise<{ closed?: string }> };

export default async function PlayPage({ searchParams }: PlayPageProps) {
  const session = await findCurrentSession();
  if (!session) redirect('/');
  const t = await getTranslations('Play');
  const isGuest = session.account === null;
  const { closed } = await searchParams;
  return <>
    {closed === '1' && <RoomClosedNotice message={t('roomClosed')} />}
    {closed === 'idle' && <RoomClosedToast message={t('roomClosedIdle')} dismissLabel={t('dismissMessage')} />}
    <TrainerDashboard greeting={t('greeting', { name: session.guest.trainerName })}
    status={isGuest && <ProgressBadge>{t('guestLabel')}</ProgressBadge>}
    raceAction={<>
      <form action={findRace}><SubmitButton label={t('findRace')} /></form>
      <form action={createRoom}><SubmitButton label={t('createRoom')} variant="secondary" /></form>
    </>} />
  </>;
}
