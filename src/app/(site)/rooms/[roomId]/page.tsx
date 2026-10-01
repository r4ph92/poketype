import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { PageMain } from '@/components/pixel/PageMain';
import type { RoomSnapshot } from '@/domain/room-view';
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

async function Invitation() {
  const t = await getTranslations('Room');
  return (
    <>
      <p className="max-w-[65ch]">{t('inviteHint')}</p>
      <CopyRoomLink copyLabel={t('copyLink')} copiedMessage={t('copied')} copyFailedMessage={t('copyFailed')} linkLabel={t('linkLabel')} />
    </>
  );
}

async function RoomScreen({ snapshot }: { snapshot: RoomSnapshot }) {
  const t = await getTranslations('Room');
  const { Room, Lobby, Pokemon, Animation, Metadata: metadataMessages } = await getMessages();
  const messages = { Animation, Lobby, Pokemon, Room: pickMessages(Room, liveRoomMessageKeys), Metadata: pickMessages(metadataMessages, liveRoomMetadataKeys) };
  return (
    <PageMain wide>
      <NextIntlClientProvider locale={await getLocale()} messages={messages}>
        <LiveRoom initial={snapshot} heading={t('heading')} invitation={<Invitation />} />
      </NextIntlClientProvider>
    </PageMain>
  );
}
