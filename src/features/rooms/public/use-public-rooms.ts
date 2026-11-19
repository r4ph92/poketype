'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { gameConfig } from '@/config/game';
import { parsePublicRooms, type PublicRoom } from '@/domain/public-room';
import type { TextLanguage } from '@/domain/text-settings';
import { filterQueryString, roomMatchesFilter, type PublicRoomFilter } from '@/domain/public-room-filter';

export const publicRoomsPath = '/api/rooms/public';

type PublicRoomsView = { rooms: PublicRoom[]; isFailing: boolean; filterResult: FilterResult | null };

export type FilterResult = { count: number; language: TextLanguage | undefined };

type ListAnswer = { kind: 'rooms'; rooms: PublicRoom[] } | { kind: 'signed-out' } | { kind: 'failed' };

// The rooms of the applied filter; filterResult is the room count and language of the first answer after a filter change, and stays put while the list refreshes.
// After a filter change the rooms already held are narrowed at once, then the server's answer replaces them.
export function usePublicRooms(initialRooms: PublicRoom[], filter: PublicRoomFilter): PublicRoomsView {
  const router = useRouter();
  const [view, setView] = useState<PublicRoomsView>({ rooms: initialRooms, isFailing: false, filterResult: null });
  const query = filterQueryString(filter);
  const answeredQuery = useRef(query);
  useEffect(
    () =>
      pollPublicRooms(query, answeredQuery.current === query, (answer) => {
        if (answer.kind === 'signed-out') return router.replace('/');
        const isFirstAnswerOfChange = answer.kind === 'rooms' && answeredQuery.current !== query;
        if (answer.kind === 'rooms') answeredQuery.current = query;
        setView((previous) => nextView(previous, answer, isFirstAnswerOfChange ? filter : null));
      }),
    [router, query, filter],
  );
  return { rooms: view.rooms.filter((room) => roomMatchesFilter(room, filter)), isFailing: view.isFailing, filterResult: view.filterResult };
}

// One request at a time, then the next after refreshIntervalMs; a hidden tab skips its turns. Returns the stop function.
function pollPublicRooms(query: string, isCurrent: boolean, onAnswer: (answer: ListAnswer) => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let isStopped = false;
  async function refresh(): Promise<void> {
    const answer = document.hidden ? null : await fetchPublicRooms(query);
    if (isStopped) return;
    if (answer) onAnswer(answer);
    if (answer?.kind !== 'signed-out') timer = setTimeout(refresh, gameConfig.publicRooms.refreshIntervalMs);
  }
  timer = setTimeout(refresh, isCurrent ? gameConfig.publicRooms.refreshIntervalMs : 0);
  return () => {
    isStopped = true;
    clearTimeout(timer);
  };
}

function nextView(previous: PublicRoomsView, answer: ListAnswer, changedFilter: PublicRoomFilter | null): PublicRoomsView {
  if (answer.kind !== 'rooms') return { ...previous, isFailing: true };
  return { rooms: answer.rooms, isFailing: false, filterResult: changedFilter ? { count: answer.rooms.length, language: changedFilter.language } : previous.filterResult };
}

async function fetchPublicRooms(query: string): Promise<ListAnswer> {
  try {
    const response = await fetch(`${publicRoomsPath}${query}`, { cache: 'no-store', signal: AbortSignal.timeout(gameConfig.publicRooms.requestTimeoutMs) });
    if (response.status === 401) return { kind: 'signed-out' };
    const rooms = response.ok ? parsePublicRooms(await response.json()) : null;
    return rooms ? { kind: 'rooms', rooms } : { kind: 'failed' };
  } catch {
    return { kind: 'failed' };
  }
}
