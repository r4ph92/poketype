import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { PageMain } from '@/components/pixel/PageMain';
import { PixelButton } from '@/components/pixel/PixelButton';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { ProgressBadge } from '@/components/pixel/ProgressBadge';
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
      <PixelPanel
        titleId="play-title"
        level={1}
        title={t('greeting', { name: session.guest.trainerName })}
        meta={isGuest && <ProgressBadge>{t('guestLabel')}</ProgressBadge>}
      >
        <div className="flex flex-wrap items-center gap-4">
          <form action={createRoom}>
            <CreateRoomButton label={t('createRoom')} />
          </form>
          <form action={leaveAsGuest}>
            <PixelButton type="submit" variant="secondary">
              {isGuest ? t('leave') : t('logOut')}
            </PixelButton>
          </form>
        </div>
      </PixelPanel>
    </PageMain>
  );
}
