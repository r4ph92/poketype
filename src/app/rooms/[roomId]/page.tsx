import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import type { RoomSnapshot } from '@/domain/room-view';
import { AccountBar } from '@/features/account/AccountBar';
import { CopyRoomLink } from '@/features/rooms/CopyRoomLink';
import { LiveRoom } from '@/features/rooms/LiveRoom';
import { liveRoomMessageKeys, liveRoomMetadataKeys } from '@/features/rooms/live-room-messages';
import { RaceAlreadyStarted } from '@/features/rooms/RaceAlreadyStarted';
import { pickMessages } from '@/i18n/pick-messages';
import { enterRoom, type RoomEntry } from './load-room';

type RoomPageProps = { params: Promise<{ roomId: string }> };

export async function generateMetadata({ params }: RoomPageProps): Promise<Metadata> {
  const entry = await enterRoom((await params).roomId);
  const t = await getTranslations('Metadata');
  return { title: t(pageTitleKey(entry)) };
}

function pageTitleKey(entry: RoomEntry): 'raceStartedTitle' | 'resultsTitle' | 'raceTitle' | 'roomTitle' {
  if (entry.kind === 'race-started') return 'raceStartedTitle';
  if (entry.snapshot.race?.results) return 'resultsTitle';
  return entry.snapshot.race ? 'raceTitle' : 'roomTitle';
}

export default async function RoomPage({ params }: RoomPageProps) {
  const entry = await enterRoom((await params).roomId);
  if (entry.kind === 'race-started') return <RaceAlreadyStarted />;
  return <RoomScreen snapshot={entry.snapshot} />;
}

async function RoomScreen({ snapshot }: { snapshot: RoomSnapshot }) {
  const t = await getTranslations('Room');
  const { Room, Metadata: metadataMessages } = await getMessages();
  return (
    <>
      <AccountBar />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <NextIntlClientProvider locale={await getLocale()} messages={{ Room: pickMessages(Room, liveRoomMessageKeys), Metadata: pickMessages(metadataMessages, liveRoomMetadataKeys) }}>
          <LiveRoom
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
    </>
  );
}
