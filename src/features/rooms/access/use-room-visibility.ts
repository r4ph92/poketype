'use client';

import { useState } from 'react';
import type { RoomId } from '@/domain/room-id';
import type { RoomVisibility } from '@/domain/room-visibility';
import { requestVisibility } from './request-visibility';

type RoomAccessState = { roomId: RoomId; visibility: RoomVisibility; revision: number };

// The requested choice shows only while the snapshot is still the one it was made on; the next revision tells the truth.
type Request = { visibility: RoomVisibility; revision: number; status: 'pending' | 'sent' | 'failed' };

export function useRoomVisibility({ roomId, visibility, revision }: RoomAccessState) {
  const [request, setRequest] = useState<Request | null>(null);
  const isCurrent = request !== null && request.revision === revision;
  const shown = isCurrent && request.status !== 'failed' ? request.visibility : visibility;

  async function choose(chosen: RoomVisibility): Promise<void> {
    if (isCurrent && request.status === 'pending') return;
    setRequest({ visibility: chosen, revision, status: 'pending' });
    const accepted = await requestVisibility(roomId, chosen);
    setRequest({ visibility: chosen, revision, status: accepted ? 'sent' : 'failed' });
  }

  return { shown, hasFailed: isCurrent && request.status === 'failed', choose: (chosen: RoomVisibility) => void choose(chosen) };
}
