'use client';

import { useTranslations } from 'next-intl';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { PixelLink } from '@/components/pixel/PixelButton';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { ProgressBadge } from '@/components/pixel/ProgressBadge';
import { gameConfig } from '@/config/game';
import type { PublicRoom } from '@/domain/public-room';
import { roomPath } from '@/domain/room-id';
import { usePublicRooms } from './use-public-rooms';

export function PublicRoomList({ initialRooms }: { initialRooms: PublicRoom[] }) {
  const t = useTranslations('PublicRooms');
  const { rooms, isFailing } = usePublicRooms(initialRooms);
  return (
    <PixelPanel titleId="public-rooms-title" title={t('heading')} meta={t('count', { count: rooms.length })}>
      <div role="status">{isFailing && <p className="text-error">{t('unavailable')}</p>}</div>
      {rooms.length === 0 ? <NoPublicRoom /> : <PublicRoomRows rooms={rooms} />}
    </PixelPanel>
  );
}

function NoPublicRoom() {
  const t = useTranslations('PublicRooms');
  return (
    <DialogueBox>
      <p className="font-bold">{t('empty')}</p>
      <p>{t('emptyHint')}</p>
    </DialogueBox>
  );
}

function PublicRoomRows({ rooms }: { rooms: PublicRoom[] }) {
  const t = useTranslations('PublicRooms');
  return (
    <ul aria-label={t('listLabel')} className="public-room-list">
      {rooms.map((room) => (
        <li key={room.roomId} data-room={room.roomId} className="public-room">
          <span className="min-w-0 flex-1 basis-40 font-bold wrap-anywhere">{t('roomOf', { name: room.hostName })}</span>
          <span className="shrink-0 tabular-nums">{t('players', { count: room.playerCount, capacity: gameConfig.rooms.capacity })}</span>
          <ProgressBadge variant="waiting">{t('waiting')}</ProgressBadge>
          <PixelLink href={roomPath(room.roomId)} label={t('joinLabel', { name: room.hostName })}>
            {t('join')}
          </PixelLink>
        </li>
      ))}
    </ul>
  );
}
