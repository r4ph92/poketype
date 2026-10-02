import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { PageMain } from '@/components/pixel/PageMain';
import type { RoomSnapshot } from '@/domain/room-view';
import { LiveRoom } from '@/features/rooms/LiveRoom';
import { liveRoomMessageKeys, liveRoomMetadataKeys } from '@/features/rooms/live-room-messages';
import { RaceAlreadyStarted } from '@/features/rooms/RaceAlreadyStarted';
import { RoomFull } from '@/features/rooms/RoomFull';
import { pickMessages } from '@/i18n/pick-messages';
import { publicPushConfig } from '@/server/push/push-server';
import { enterRoom, type RoomEntry } from './load-room';

type RoomPageProps = { params: Promise<{ roomId: string }> };

export async function generateMetadata({ params }: RoomPageProps): Promise<Metadata> {
  const entry = await enterRoom((await params).roomId);
  const t = await getTranslations('Metadata');
  return { title: t(pageTitleKey(entry)) };
}

function pageTitleKey(entry: RoomEntry): 'raceStartedTitle' | 'roomFullTitle' | 'resultsTitle' | 'raceTitle' | 'roomTitle' {
  if (entry.kind === 'race-started') return 'raceStartedTitle';
  if (entry.kind === 'full') return 'roomFullTitle';
  if (entry.snapshot.race?.results) return 'resultsTitle';
  return entry.snapshot.race ? 'raceTitle' : 'roomTitle';
}

export default async function RoomPage({ params }: RoomPageProps) {
  const entry = await enterRoom((await params).roomId);
  if (entry.kind === 'race-started') return <RaceAlreadyStarted />;
  if (entry.kind === 'full') return <RoomFull />;
  return <RoomScreen snapshot={entry.snapshot} />;
}

async function RoomScreen({ snapshot }: { snapshot: RoomSnapshot }) {
  const t = await getTranslations('Room');
  const { Room, Lobby, Pokemon, Animation, Play, RoomAccess, TextSettings, Metadata: metadataMessages } = await getMessages();
  const messages = {
    Animation,
    Lobby,
    TextSettings,
    Pokemon,
    Play: pickMessages(Play, ['guestLabel', 'createRoom', 'dismissMessage']),
    RoomAccess: pickMessages(RoomAccess, ['visibilityLegend', 'public', 'publicHint', 'unlisted', 'unlistedHint']),
    Room: pickMessages(Room, liveRoomMessageKeys),
    Metadata: pickMessages(metadataMessages, liveRoomMetadataKeys),
  };
  return (
    <PageMain wide>
      <NextIntlClientProvider locale={await getLocale()} messages={messages}>
        <LiveRoom initial={snapshot} pushConfig={publicPushConfig()} heading={t('heading')} />
      </NextIntlClientProvider>
    </PageMain>
  );
}
