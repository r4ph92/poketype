'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { isViewerHost, racersOf, type RoomSnapshot } from '@/domain/room-view';
import { invitesByLink } from '@/domain/room-visibility';
import type { ServerClock } from '@/domain/server-clock';
import { AddBotPanel } from './bots/AddBotPanel';
import { CapacityPanel } from './capacity/CapacityPanel';
import { HostRolePanel } from './host-role/HostRolePanel';
import { HostWaitMessage } from './HostWaitMessage';
import { IdleLobbyToast } from './IdleLobbyToast';
import { InvitationLinks } from './invitations/InvitationLinks';
import { LobbyRoster } from './LobbyRoster';
import { RoomInvitation } from './RoomInvitation';
import { RoomVisibilityControl } from './RoomVisibilityControl';
import { TimeLimitPanel } from './time-limit/TimeLimitPanel';
import type { CoherentLimits } from '@/domain/coherent-limit';
import { StartRaceControl } from './StartRaceControl';
import { TextSettingsPanel } from './text-settings/TextSettingsPanel';
import { useFocusedHeading } from './use-focused-heading';

type WaitingRoomViewProps = { snapshot: RoomSnapshot; clock: ServerClock; isReconnecting: boolean; isBackFromRace: boolean; canCreateRoom: boolean; heading: ReactNode; leave: ReactNode; coherentLimits: CoherentLimits };

export function WaitingRoomView({ snapshot, clock, isReconnecting, isBackFromRace, canCreateRoom, heading, leave, coherentLimits }: WaitingRoomViewProps) {
  const t = useTranslations('Room');
  const lobby = useTranslations('Lobby');
  const headingRef = useFocusedHeading(useTranslations('Metadata')('roomTitle'), isBackFromRace);
  return (
    <div className="lobby-layout">
      <div className="lobby-main">
        <PixelPanel titleId="room-title" level={1} title={heading} headingRef={headingRef} meta={t('playerCount', { count: racersOf(snapshot.members).length })}>
          <p>{lobby('hint')}</p>
          {isReconnecting && <p role="status" className="text-error">{t('reconnecting')}</p>}
          <LobbyRoster roomId={snapshot.roomId} members={snapshot.members} isHostViewing={isViewerHost(snapshot)} />
        </PixelPanel>
        <TextSettingsPanel snapshot={snapshot} />
        <TimeLimitPanel snapshot={snapshot} />
        <CapacityPanel snapshot={snapshot} />
        {isViewerHost(snapshot) && <HostRoleSection snapshot={snapshot} />}
        {isViewerHost(snapshot) && <AddBotPanel roomId={snapshot.roomId} />}
      </div>
      <div className="lobby-sidebar">
        <PixelPanel titleId="room-controls" title={t('raceStatus')}>
          <RaceStartArea snapshot={snapshot} coherentLimits={coherentLimits} />
          {leave}
        </PixelPanel>
        <PixelPanel titleId="room-invite-title" title={lobby('inviteTitle')}>
          {snapshot.visibility !== 'private' && <RoomInvitation code={snapshot.code} />}
          <HostInvitationLinks snapshot={snapshot} />
          <RoomVisibilityControl snapshot={snapshot} />
        </PixelPanel>
      </div>
      <IdleLobbyToast lobbyIdle={snapshot.lobbyIdle} clock={clock} canCreateRoom={canCreateRoom} />
    </div>
  );
}

// Only the host makes links, for a room not listed publicly; a private room hides its code and room link, since only these links let anyone in.
function HostInvitationLinks({ snapshot }: { snapshot: RoomSnapshot }) {
  const viewer = snapshot.members.find((member) => member.isViewer);
  if (!viewer?.isHost || !invitesByLink(snapshot.visibility)) return null;
  return <InvitationLinks roomId={snapshot.roomId} viewerMemberKey={viewer.memberKey} invitations={snapshot.invitations} />;
}

function RaceStartArea({ snapshot, coherentLimits }: { snapshot: RoomSnapshot; coherentLimits: CoherentLimits }) {
  const t = useTranslations('Room');
  if (isViewerHost(snapshot)) return <HostStartArea snapshot={snapshot} coherentLimits={coherentLimits} />;
  return <HostWaitMessage isHostAway={snapshot.isHostAway} waitingMessage={t('hostWillStart')} />;
}

function HostStartArea({ snapshot, coherentLimits }: { snapshot: RoomSnapshot; coherentLimits: CoherentLimits }) {
  const racers = racersOf(snapshot.members);
  const humanCount = racers.filter((member) => member.bot === null).length;
  return <StartRaceControl roomId={snapshot.roomId} racerCount={racers.length} humanCount={humanCount} textSettings={snapshot.textSettings} coherentLimits={coherentLimits} />;
}

// Beside the seat settings rather than in the sidebar, so the room code and the start button stay on one screen (DES-06).
function HostRoleSection({ snapshot }: { snapshot: RoomSnapshot }) {
  const t = useTranslations('HostRole');
  return (
    <PixelPanel titleId="host-role-title" title={t('legend')}>
      <HostRolePanel snapshot={snapshot} isLegendHidden />
    </PixelPanel>
  );
}
