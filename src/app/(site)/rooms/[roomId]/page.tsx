import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { PageMain } from '@/components/pixel/PageMain';
import type { RoomSnapshot } from '@/domain/room-view';
import { LiveRoom } from '@/features/rooms/LiveRoom';
import { invitationLinksMessageKeys } from '@/features/rooms/invitations/invitation-links-messages';
import { liveRoomMessageKeys, liveRoomMetadataKeys } from '@/features/rooms/live-room-messages';
import { PrivateRoom } from '@/features/rooms/PrivateRoom';
import { RaceAlreadyStarted } from '@/features/rooms/RaceAlreadyStarted';
import { RoomFull } from '@/features/rooms/RoomFull';
import { pickMessages } from '@/i18n/pick-messages';
import { findCurrentSession } from '@/server/sessions/current-session';
import { publicPushConfig } from '@/server/push/push-server';
import { coherentLimits } from '@/server/rooms/coherent-limits';
import { enterRoom, type RoomEntry } from './load-room';

type RoomPageProps = { params: Promise<{ roomId: string }> };

export async function generateMetadata({ params }: RoomPageProps): Promise<Metadata> {
  const entry = await enterRoom((await params).roomId);
  const t = await getTranslations('Metadata');
  return { title: t(pageTitleKey(entry)) };
}

function pageTitleKey(entry: RoomEntry): 'raceStartedTitle' | 'roomFullTitle' | 'privateRoomTitle' | 'resultsTitle' | 'raceTitle' | 'roomTitle' {
  if (entry.kind === 'race-started') return 'raceStartedTitle';
  if (entry.kind === 'full') return 'roomFullTitle';
  if (entry.kind === 'private') return 'privateRoomTitle';
  if (entry.snapshot.race?.results) return 'resultsTitle';
  return entry.snapshot.race ? 'raceTitle' : 'roomTitle';
}

export default async function RoomPage({ params }: RoomPageProps) {
  const entry = await enterRoom((await params).roomId);
  if (entry.kind === 'race-started') return <RaceAlreadyStarted />;
  if (entry.kind === 'full') return <RoomFull />;
  if (entry.kind === 'private') return <PrivateRoom />;
  return <RoomScreen snapshot={entry.snapshot} />;
}

async function RoomScreen({ snapshot }: { snapshot: RoomSnapshot }) {
  const t = await getTranslations('Room');
  const canCreateRoom = (await findCurrentSession())?.account != null;
  const { Room, Lobby, Pokemon, Animation, Play, RoomAccess, Invitations, TextSettings, Bots, Metadata: metadataMessages } = await getMessages();
  const messages = {
    Animation,
    Bots,
    Lobby,
    TextSettings,
    Pokemon,
    Play: pickMessages(Play, ['guestLabel', 'createRoom', 'dismissMessage']),
    RoomAccess: pickMessages(RoomAccess, ['visibilityLegend', 'public', 'publicHint', 'unlisted', 'unlistedHint', 'private', 'privateHint']),
    Invitations: pickMessages(Invitations, invitationLinksMessageKeys),
    Room: pickMessages(Room, liveRoomMessageKeys),
    Metadata: pickMessages(metadataMessages, liveRoomMetadataKeys),
  };
  return (
    <PageMain wide>
      <NextIntlClientProvider locale={await getLocale()} messages={messages}>
        <LiveRoom initial={snapshot} pushConfig={publicPushConfig()} heading={t('heading')} canCreateRoom={canCreateRoom} coherentLimits={coherentLimits} />
      </NextIntlClientProvider>
    </PageMain>
  );
}
