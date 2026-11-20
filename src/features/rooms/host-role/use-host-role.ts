'use client';

import { useState } from 'react';
import type { HostRole } from '@/domain/host-role';
import type { RoomId } from '@/domain/room-id';
import { requestHostRole, type HostRoleOutcome } from './request-host-role';

type HostRoleState = { roomId: RoomId; role: HostRole; revision: number };

// The requested role shows only while the snapshot is still the one it was made on; the next revision tells the truth.
type Request = { role: HostRole; revision: number; status: 'pending' | HostRoleOutcome };

export function useHostRole({ roomId, role, revision }: HostRoleState) {
  const [request, setRequest] = useState<Request | null>(null);
  const isCurrent = request !== null && request.revision === revision;
  const refusal = isCurrent && (request.status === 'full' || request.status === 'failed') ? request.status : null;
  const shown = isCurrent && refusal === null ? request.role : role;

  async function choose(chosen: HostRole): Promise<void> {
    if (isCurrent && request.status === 'pending') return;
    setRequest({ role: chosen, revision, status: 'pending' });
    setRequest({ role: chosen, revision, status: await requestHostRole(roomId, chosen) });
  }

  return { shown, refusal, choose: (chosen: HostRole) => void choose(chosen) };
}
