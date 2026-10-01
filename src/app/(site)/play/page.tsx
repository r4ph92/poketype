import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { ProgressBadge } from '@/components/pixel/ProgressBadge';
import { TrainerDashboard } from '@/features/trainer/TrainerDashboard';
import { CreateRoomButton } from '@/features/rooms/CreateRoomButton';
import { createRoom } from '@/features/rooms/create-room';
import { findCurrentSession } from '@/server/sessions/current-session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  return { title: t('playTitle') };
}

export default async function PlayPage() {
  const session = await findCurrentSession();
  if (!session) redirect('/');
  const t = await getTranslations('Play');
  const isGuest = session.account === null;
  return <TrainerDashboard greeting={t('greeting', { name: session.guest.trainerName })}
    status={isGuest && <ProgressBadge>{t('guestLabel')}</ProgressBadge>}
    raceAction={<form action={createRoom}><CreateRoomButton label={t('createRoom')} /></form>} />;
}
