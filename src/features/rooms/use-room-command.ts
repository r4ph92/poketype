'use client';

import { useRef, useState } from 'react';
import type { RoomId } from '@/domain/room-id';
import { postRoomCommand, type RoomCommand } from './post-room-command';

export type RoomCommandState = 'idle' | 'pending' | 'failed';

// After a success the state stays pending: the next snapshot replaces this view (the countdown after a start, the lobby after a prepare).
export function useRoomCommand(roomId: RoomId, command: RoomCommand): { state: RoomCommandState; run: () => void } {
  const [state, setState] = useState<RoomCommandState>('idle');
  const isRequesting = useRef(false);

  async function run(): Promise<void> {
    if (isRequesting.current) return;
    isRequesting.current = true;
    setState('pending');
    const accepted = await postRoomCommand(roomId, command);
    isRequesting.current = accepted;
    setState(accepted ? 'pending' : 'failed');
  }

  return { state, run: () => void run() };
}
