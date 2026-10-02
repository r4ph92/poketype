import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { gameConfig } from '@/config/game';
import { CreateRoomChoice } from '@/features/rooms/access/CreateRoomChoice';
import { JoinWithCodeForm } from '@/features/rooms/access/JoinWithCodeForm';
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
  const { PublicRooms, RoomAccess } = await getMessages();
  const rooms = await findPublicRooms(database, gameConfig.publicRooms.listLimit, new Date());
  return <>
    <PixelPanel titleId="race-hub-title" level={1} title={header('tabs.race')}>
      <p>{t('raceHubHint')}</p>
      <div className="flex flex-wrap gap-4">
        <NextIntlClientProvider messages={{ RoomAccess }}><CreateRoomChoice label={play('createRoom')} /></NextIntlClientProvider>
        <PracticeButton />
      </div>
      <NextIntlClientProvider messages={{ RoomAccess }}><JoinWithCodeForm /></NextIntlClientProvider>
    </PixelPanel>
    <NextIntlClientProvider messages={{ PublicRooms }}>
      <PublicRoomList initialRooms={rooms} />
    </NextIntlClientProvider>
  </>;
}
