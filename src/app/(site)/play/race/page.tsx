import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { SubmitButton } from '@/components/pixel/SubmitButton';
import { gameConfig } from '@/config/game';
import { createRoom } from '@/features/rooms/create-room';
import { PublicRoomList } from '@/features/rooms/public/PublicRoomList';
import { PracticeButton } from '@/features/trainer/PracticeButton';
import { database } from '@/server/db/client';
import { findPublicRooms } from '@/server/rooms/public-rooms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Header');
  return { title: t('tabs.race') };
}

export default async function RacePage() {
  const t = await getTranslations('Trainer');
  const header = await getTranslations('Header');
  const play = await getTranslations('Play');
  const { PublicRooms } = await getMessages();
  const rooms = await findPublicRooms(database, gameConfig.publicRooms.listLimit, new Date());
  return <>
    <PixelPanel titleId="race-hub-title" level={1} title={header('tabs.race')}>
      <p>{t('raceHubHint')}</p>
      <div className="flex flex-wrap gap-4">
        <form action={createRoom}><SubmitButton label={play('createRoom')} /></form>
        <PracticeButton />
      </div>
      <p className="text-sm text-muted">{t('joinHint')}</p>
    </PixelPanel>
    <NextIntlClientProvider messages={{ PublicRooms }}>
      <PublicRoomList initialRooms={rooms} />
    </NextIntlClientProvider>
  </>;
}
