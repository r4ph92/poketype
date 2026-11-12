'use client';

import { useEffect, useRef, useState } from 'react';
import { gameConfig } from '@/config/game';
import type { RoomId } from '@/domain/room-id';
import type { TimeLimit } from '@/domain/time-limit';
import { requestTimeLimit } from './request-time-limit';

type RoomTimeLimit = { roomId: RoomId; timeLimitSeconds: TimeLimit; revision: number };

type Request = { timeLimitSeconds: TimeLimit; revision: number; status: 'pending' | 'sent' | 'failed' };

// Like the text settings: the requested value shows while the snapshot is still the one it was made on, and a slider drag sends once after a pause.
export function useTimeLimit({ roomId, timeLimitSeconds, revision }: RoomTimeLimit) {
  const [request, setRequest] = useState<Request | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const isCurrent = request !== null && request.revision === revision;
  const shown = isCurrent && request.status !== 'failed' ? request.timeLimitSeconds : timeLimitSeconds;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function send(chosen: TimeLimit): Promise<void> {
    const accepted = await requestTimeLimit(roomId, chosen);
    setRequest((current) => (current?.timeLimitSeconds === chosen ? { ...current, status: accepted ? 'sent' : 'failed' } : current));
  }

  function change(chosen: TimeLimit): void {
    setRequest({ timeLimitSeconds: chosen, revision, status: 'pending' });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void send(chosen), gameConfig.text.settingsSendDelayMs);
  }

  return { shown, hasFailed: isCurrent && request.status === 'failed', change };
}
