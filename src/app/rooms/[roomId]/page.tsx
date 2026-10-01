import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import type { RoomSnapshot } from '@/domain/room-view';
import { CopyRoomLink } from '@/features/rooms/CopyRoomLink';
import { LiveRoomRoster } from '@/features/rooms/LiveRoomRoster';
import { liveRoomRosterMessageKeys } from '@/features/rooms/live-room-roster-messages';
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

async function WaitingRoom({ snapshot }: { snapshot: RoomSnapshot }) {
  const t = await getTranslations('Room');
  const { Room, Metadata: metadataMessages } = await getMessages();
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <NextIntlClientProvider locale={await getLocale()} messages={{ Room: pickMessages(Room, liveRoomRosterMessageKeys), Metadata: pickMessages(metadataMessages, ['roomNotFoundTitle']) }}>
        <LiveRoomRoster
          initial={snapshot}
          heading={<h1 className="text-3xl font-bold">{t('heading')}</h1>}
          invitation={
            <>
              <p className="mt-4">{t('inviteHint')}</p>
              <CopyRoomLink
                copyLabel={t('copyLink')}
                copiedMessage={t('copied')}
                copyFailedMessage={t('copyFailed')}
                linkLabel={t('linkLabel')}
              />
            </>
          }
        />
      </NextIntlClientProvider>
    </main>
  );
}
