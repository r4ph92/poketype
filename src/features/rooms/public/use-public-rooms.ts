'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { gameConfig } from '@/config/game';
import { parsePublicRooms, type PublicRoom } from '@/domain/public-room';

export const publicRoomsPath = '/api/rooms/public';

type PublicRoomsView = { rooms: PublicRoom[]; isFailing: boolean };

type ListAnswer = { kind: 'rooms'; rooms: PublicRoom[] } | { kind: 'signed-out' } | { kind: 'failed' };

export function usePublicRooms(initialRooms: PublicRoom[]): PublicRoomsView {
  const router = useRouter();
  const [view, setView] = useState<PublicRoomsView>({ rooms: initialRooms, isFailing: false });
  useEffect(
    () =>
      pollPublicRooms((answer) => {
        if (answer.kind === 'signed-out') return router.replace('/');
        setView((previous) => nextView(previous, answer));
      }),
    [router],
  );
  return view;
}

// One request at a time, then the next after refreshIntervalMs; a hidden tab skips its turns. Returns the stop function.
function pollPublicRooms(onAnswer: (answer: ListAnswer) => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let isStopped = false;
  async function refresh(): Promise<void> {
    const answer = document.hidden ? null : await fetchPublicRooms();
    if (isStopped) return;
    if (answer) onAnswer(answer);
    if (answer?.kind !== 'signed-out') timer = setTimeout(refresh, gameConfig.publicRooms.refreshIntervalMs);
  }
  timer = setTimeout(refresh, gameConfig.publicRooms.refreshIntervalMs);
  return () => {
    isStopped = true;
    clearTimeout(timer);
  };
}

function nextView(previous: PublicRoomsView, answer: ListAnswer): PublicRoomsView {
  if (answer.kind === 'rooms') return { rooms: answer.rooms, isFailing: false };
  return { rooms: previous.rooms, isFailing: true };
}

async function fetchPublicRooms(): Promise<ListAnswer> {
  try {
    const response = await fetch(publicRoomsPath, { cache: 'no-store', signal: AbortSignal.timeout(gameConfig.publicRooms.requestTimeoutMs) });
    if (response.status === 401) return { kind: 'signed-out' };
    const rooms = response.ok ? parsePublicRooms(await response.json()) : null;
    return rooms ? { kind: 'rooms', rooms } : { kind: 'failed' };
  } catch {
    return { kind: 'failed' };
  }
}
