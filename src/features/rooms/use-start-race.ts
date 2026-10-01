'use client';

import { useRef, useState } from 'react';
import type { RoomId } from '@/domain/room-id';

export type StartRaceState = 'idle' | 'pending' | 'failed';

// After a success the state stays pending: the next snapshot replaces this view with the countdown.
export function useStartRace(roomId: RoomId): { state: StartRaceState; startRace: () => void } {
  const [state, setState] = useState<StartRaceState>('idle');
  const isRequesting = useRef(false);

  async function startRace(): Promise<void> {
    if (isRequesting.current) return;
    isRequesting.current = true;
    setState('pending');
    const accepted = await requestStart(roomId);
    isRequesting.current = accepted;
    setState(accepted ? 'pending' : 'failed');
  }

  return { state, startRace: () => void startRace() };
}

async function requestStart(roomId: RoomId): Promise<boolean> {
  try {
    const response = await fetch(`/api/rooms/${roomId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}
