'use client';

import { useTranslations } from 'next-intl';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import type { RoomId } from '@/domain/room-id';
import type { RoomMemberView } from '@/domain/room-view';
import { KickPlayerButton } from './KickPlayerButton';

type ResultsKickPanelProps = { roomId: RoomId; members: readonly RoomMemberView[] };

// The results table lists racers only, so this is where the host reaches everyone in the room, spectators included.
export function ResultsKickPanel({ roomId, members }: ResultsKickPanelProps) {
  const t = useTranslations('Lobby');
  const kickable = members.filter((member) => !member.isViewer && member.bot === null);
  if (kickable.length === 0) return null;
  return (
    <PixelPanel titleId="kick-panel-title" title={t('kickPanelHeading')}>
      <ul className="grid gap-3">
        {kickable.map((member) => (
          <li key={member.memberKey} className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-bold wrap-anywhere">{member.trainerName}</span>
            <KickPlayerButton roomId={roomId} memberKey={member.memberKey} name={member.trainerName} />
          </li>
        ))}
      </ul>
    </PixelPanel>
  );
}
