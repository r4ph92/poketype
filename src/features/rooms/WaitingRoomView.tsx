'use client';

import Image from 'next/image';
import { LobbyRoster } from './LobbyRoster';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { isViewerHost, type RoomSnapshot } from '@/domain/room-view';
import { StartRaceControl } from './StartRaceControl';

type WaitingRoomViewProps = { snapshot: RoomSnapshot; isReconnecting: boolean; heading: ReactNode; invitation: ReactNode; leave: ReactNode };

export function WaitingRoomView({ snapshot, isReconnecting, heading, invitation, leave }: WaitingRoomViewProps) {
  const t = useTranslations('Room');
  const lobby = useTranslations('Lobby');
  const decorativeAlt = '';
  return (
    <div className="lobby-layout">
      <PixelPanel titleId="room-title" level={1} title={heading} meta={t('playerCount', { count: snapshot.members.length })}>
        <p>{lobby('hint')}</p>
        <p className="text-sm text-muted">{lobby('rosterDemo')}</p>
        {isReconnecting && <p role="status" className="text-error">{t('reconnecting')}</p>}
        <LobbyRoster members={snapshot.members} />
      </PixelPanel>
      <div className="lobby-sidebar">
        <PixelPanel titleId="room-invite-title" title={lobby('inviteTitle')}>
          <p className="font-pixel font-bold">{lobby('code')}</p>
          <code className="lobby-invite-code">{snapshot.roomId}</code>
          {invitation}
        </PixelPanel>
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
