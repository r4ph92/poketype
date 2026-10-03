'use client';

import { useState } from 'react';
import { PixelButton } from '@/components/pixel/PixelButton';
import type { RoomId } from '@/domain/room-id';
import { requestRemoval } from './request-removal';

type RemovePlayerButtonProps = { roomId: RoomId; memberKey: string; label: string; accessibleLabel: string; failureMessage: string };

type RemovalState = 'idle' | 'pending' | 'failed';

// The visible word starts the accessible name, which adds who is removed. After a success the next snapshot removes or relabels the row.
export function RemovePlayerButton({ roomId, memberKey, label, accessibleLabel, failureMessage }: RemovePlayerButtonProps) {
  const [state, setState] = useState<RemovalState>('idle');

  async function remove(): Promise<void> {
    if (state === 'pending') return;
    setState('pending');
    setState((await requestRemoval(roomId, memberKey)) ? 'pending' : 'failed');
  }

  return (
    <span className="grid gap-1">
      <PixelButton variant="secondary" pending={state === 'pending'} onClick={() => void remove()}>
        <span aria-hidden="true">{label}</span>
        <span className="sr-only">{accessibleLabel}</span>
      </PixelButton>
      {state === 'failed' && <span role="alert" className="text-sm font-bold text-error">{failureMessage}</span>}
    </span>
  );
}
