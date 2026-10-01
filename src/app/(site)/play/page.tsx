import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { PageMain } from '@/components/pixel/PageMain';
import { CreateRoomButton } from '@/features/rooms/CreateRoomButton';
import { createRoom } from '@/features/rooms/create-room';
import { leaveAsGuest } from '@/features/guest/leave-as-guest';
import { findCurrentSession } from '@/server/sessions/current-session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  return { title: t('playTitle') };
}

export default async function PlayPage() {
  const session = await findCurrentSession();
  if (!session) redirect('/');
  const isGuest = session.account === null;
  const t = await getTranslations('Play');
  return (
    <PageMain>
      <h1 className="text-3xl font-bold wrap-anywhere sm:text-4xl">{t('greeting', { name: session.guest.trainerName })}</h1>
      {isGuest && <p className="mt-4 inline-block border-4 border-ink bg-gold px-3 py-1 font-bold">{t('guestLabel')}</p>}
      <form action={createRoom} className="mt-8">
        <CreateRoomButton label={t('createRoom')} />
      </form>
      <form action={leaveAsGuest} className="mt-4">
        <button type="submit" className="min-h-11 border-4 border-ink bg-cream px-6 font-bold">
          {isGuest ? t('leave') : t('logOut')}
        </button>
      </form>
    </PageMain>
  );
}
