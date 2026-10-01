import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { PageMain } from '@/components/pixel/PageMain';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import type { RoomSnapshot } from '@/domain/room-view';
import { CopyRoomLink } from '@/features/rooms/CopyRoomLink';
import { LiveRoomRoster } from '@/features/rooms/LiveRoomRoster';
import { liveRoomRosterMessageKeys, liveRoomRosterMetadataKeys } from '@/features/rooms/live-room-roster-messages';
import { RaceAlreadyStarted } from '@/features/rooms/RaceAlreadyStarted';
import { pickMessages } from '@/i18n/pick-messages';
import { enterRoom } from './load-room';

type RoomPageProps = { params: Promise<{ roomId: string }> };

export async function generateMetadata({ params }: RoomPageProps): Promise<Metadata> {
  const entry = await enterRoom((await params).roomId);
  const t = await getTranslations('Metadata');
  return { title: entry.kind === 'race-started' ? t('raceStartedTitle') : t('roomTitle') };
}

export default async function RoomPage({ params }: RoomPageProps) {
  const entry = await enterRoom((await params).roomId);
  if (entry.kind === 'race-started') return <RaceAlreadyStarted />;
  return <WaitingRoom snapshot={entry.snapshot} />;
}

async function InvitationPanel() {
  const t = await getTranslations('Room');
  return (
    <PixelPanel titleId="room-title" level={1} title={t('heading')}>
      <p className="max-w-[65ch]">{t('inviteHint')}</p>
      <CopyRoomLink
        copyLabel={t('copyLink')}
        copiedMessage={t('copied')}
        copyFailedMessage={t('copyFailed')}
        linkLabel={t('linkLabel')}
      />
    </PixelPanel>
  );
}

async function WaitingRoom({ snapshot }: { snapshot: RoomSnapshot }) {
  const { Room, Metadata: metadataMessages } = await getMessages();
  const messages = { Room: pickMessages(Room, liveRoomRosterMessageKeys), Metadata: pickMessages(metadataMessages, liveRoomRosterMetadataKeys) };
  return (
    <PageMain>
      <NextIntlClientProvider locale={await getLocale()} messages={messages}>
        <LiveRoomRoster initial={snapshot} invitation={<InvitationPanel />} />
      </NextIntlClientProvider>
    </PageMain>
  );
}
