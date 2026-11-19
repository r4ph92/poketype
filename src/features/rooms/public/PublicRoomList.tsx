'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { PixelButton, PixelLink } from '@/components/pixel/PixelButton';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { ProgressBadge } from '@/components/pixel/ProgressBadge';
import { canJoinPublicRoom, type PublicRoom } from '@/domain/public-room';
import { filterQueryString, type PublicRoomFilter } from '@/domain/public-room-filter';
import { roomPath } from '@/domain/room-id';
import { PublicRoomFilters } from './PublicRoomFilters';
import { usePublicRooms } from './use-public-rooms';

type PublicRoomListProps = { initialRooms: PublicRoom[]; initialFilter: PublicRoomFilter };

// The filter lives in the address, so a reload or a shared link keeps it; replaceState adds no history entry per click.
function showFilterInAddress(filter: PublicRoomFilter): void {
  window.history.replaceState(null, '', `${window.location.pathname}${filterQueryString(filter)}`);
}

export function PublicRoomList({ initialRooms, initialFilter }: PublicRoomListProps) {
  const t = useTranslations('PublicRooms');
  const [filter, setFilter] = useState(initialFilter);
  const { rooms, isFailing, filterResult } = usePublicRooms(initialRooms, filter);
  const isFiltered = filterQueryString(filter) !== '';

  function changeFilter(next: PublicRoomFilter): void {
    setFilter(next);
    showFilterInAddress(next);
  }

  return (
    <PixelPanel titleId="public-rooms-title" title={t('heading')} meta={t('count', { count: rooms.length })}>
      <PublicRoomFilters filter={filter} onChange={changeFilter} />
      <p role="status" className="sr-only">
        {filterResult !== null && t('filterResult', { count: filterResult.count, language: filterResult.language ?? 'all' })}
      </p>
      <div role="status">{isFailing && <p className="text-error">{t('unavailable')}</p>}</div>
      {rooms.length === 0 ? <NoPublicRoom isFiltered={isFiltered} /> : <PublicRoomRows rooms={rooms} />}
    </PixelPanel>
  );
}

function NoPublicRoom({ isFiltered }: { isFiltered: boolean }) {
  const t = useTranslations('PublicRooms');
  return (
    <DialogueBox>
      <p className="font-bold">{isFiltered ? t('emptyFiltered') : t('empty')}</p>
      <p>{isFiltered ? t('emptyFilteredHint') : t('emptyHint')}</p>
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
          <span className="shrink-0 tabular-nums">{t('players', { count: room.playerCount, capacity: room.capacity })}</span>
          <span className="shrink-0">{t(`languages.${room.textLanguage}`)}</span>
          <span className="shrink-0 tabular-nums">{t('wordCount', { count: room.wordCount })}</span>
          <ProgressBadge variant={room.state === 'waiting' ? 'waiting' : 'neutral'}>{t(`states.${room.state}`)}</ProgressBadge>
          <JoinControl room={room} />
        </li>
      ))}
    </ul>
  );
}

function JoinControl({ room }: { room: PublicRoom }) {
  const t = useTranslations('PublicRooms');
  const label = t('joinLabel', { name: room.hostName });
  if (!canJoinPublicRoom(room)) {
    return (
      <PixelButton variant="secondary" unavailable label={t('joinUnavailableLabel', { name: room.hostName, state: t(`states.${room.state}`) })}>
        {t('join')}
      </PixelButton>
    );
  }
  return (
    // Opening a room page joins it, so a prefetch would seat the viewer in every room scrolled into view.
    <PixelLink href={roomPath(room.roomId)} label={label} prefetch={false}>
      {t('join')}
    </PixelLink>
  );
}
