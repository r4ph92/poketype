'use client';

import Image from 'next/image';
import { LobbyRoster } from './LobbyRoster';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { isViewerHost, type RoomSnapshot } from '@/domain/room-view';
import type { ServerClock } from '@/domain/server-clock';
import { IdleLobbyToast } from './IdleLobbyToast';
import { RoomInvitation } from './RoomInvitation';
import { RoomVisibilityControl } from './RoomVisibilityControl';
import { StartRaceControl } from './StartRaceControl';
import { TextSettingsPanel } from './text-settings/TextSettingsPanel';
import { usePageTitle } from './use-page-title';

type WaitingRoomViewProps = { snapshot: RoomSnapshot; clock: ServerClock; isReconnecting: boolean; heading: ReactNode; leave: ReactNode };

export function WaitingRoomView({ snapshot, clock, isReconnecting, heading, leave }: WaitingRoomViewProps) {
  const t = useTranslations('Room');
  const lobby = useTranslations('Lobby');
  usePageTitle(useTranslations('Metadata')('roomTitle'));
  const decorativeAlt = '';
  return (
    <div className="lobby-layout">
      <PixelPanel titleId="room-title" level={1} title={heading} meta={t('playerCount', { count: snapshot.members.length })}>
        <p>{lobby('hint')}</p>
        {isReconnecting && <p role="status" className="text-error">{t('reconnecting')}</p>}
        <LobbyRoster roomId={snapshot.roomId} members={snapshot.members} isHostViewing={isViewerHost(snapshot)} />
      </PixelPanel>
      <div className="lobby-sidebar">
        <PixelPanel titleId="room-invite-title" title={lobby('inviteTitle')}>
          <RoomInvitation code={snapshot.code} />
          <RoomVisibilityControl snapshot={snapshot} />
        </PixelPanel>
        <TextSettingsPanel snapshot={snapshot} />
        <PixelPanel titleId="room-controls" title={t('raceStatus')}>
          <RaceStartArea snapshot={snapshot} />
          {leave}
        </PixelPanel>
        <PixelPanel titleId="route-preview" title={t('routePreview')}>
          <Image src="/assets/scenes/route.svg" width={800} height={440} alt={decorativeAlt} unoptimized className="w-full border-2 border-frame pixelated" />
          <p className="font-pixel font-bold">{t('routeName')}</p>
          <p>{t('routeHint')}</p>
        </PixelPanel>
      </div>
      <IdleLobbyToast lobbyIdle={snapshot.lobbyIdle} clock={clock} />
    </div>
  );
}

function RaceStartArea({ snapshot }: { snapshot: RoomSnapshot }) {
  const t = useTranslations('Room');
  if (isViewerHost(snapshot)) return <StartRaceControl roomId={snapshot.roomId} playerCount={snapshot.members.length} />;
  return (
    <DialogueBox>
      <p>{t('hostWillStart')}</p>
    </DialogueBox>
  );
}
