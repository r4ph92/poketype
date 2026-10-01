import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { CreateRoomButton } from '@/features/rooms/CreateRoomButton';
import { createRoom } from '@/features/rooms/create-room';
import { PracticeButton } from '@/features/trainer/PracticeButton';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Header');
  return { title: t('tabs.race') };
}

export default async function RacePage() {
  const t = await getTranslations('Trainer');
  const header = await getTranslations('Header');
  const play = await getTranslations('Play');
  return <PixelPanel titleId="race-hub-title" level={1} title={header('tabs.race')}>
    <p>{t('raceHubHint')}</p>
    <div className="flex flex-wrap gap-4">
      <form action={createRoom}><CreateRoomButton label={play('createRoom')} /></form>
      <PracticeButton />
    </div>
    <p className="text-sm text-muted">{t('joinHint')}</p>
  </PixelPanel>;
}
