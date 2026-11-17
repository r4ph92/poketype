'use client';

import { useRef, useState } from 'react';
import type { RoomId } from '@/domain/room-id';
import { postRoomCommandForStatus, type RoomCommand } from './post-room-command';

export type RoomCommandState = 'idle' | 'pending' | 'failed';

// After a success the state stays pending: the next snapshot replaces this view (the countdown after a start, the lobby after a prepare).
export function useRoomCommand(roomId: RoomId, command: RoomCommand): { state: RoomCommandState; failureStatus: number | null; run: () => void } {
  const [state, setState] = useState<RoomCommandState>('idle');
  const [failureStatus, setFailureStatus] = useState<number | null>(null);
  const isRequesting = useRef(false);

  async function run(): Promise<void> {
    if (isRequesting.current) return;
    isRequesting.current = true;
    setState('pending');
    const status = await postRoomCommandForStatus(roomId, command);
    const accepted = status >= 200 && status < 300;
    setFailureStatus(accepted ? null : status);
    isRequesting.current = accepted;
    setState(accepted ? 'pending' : 'failed');
  }

  return { state, failureStatus, run: () => void run() };
}
