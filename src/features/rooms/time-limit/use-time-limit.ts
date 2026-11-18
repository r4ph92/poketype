'use client';

import type { RoomId } from '@/domain/room-id';
import type { TimeLimit } from '@/domain/time-limit';
import { useRoomSetting } from '../use-room-setting';
import { requestTimeLimit } from './request-time-limit';

type RoomTimeLimit = { roomId: RoomId; timeLimitSeconds: TimeLimit; revision: number };

export function useTimeLimit({ roomId, timeLimitSeconds, revision }: RoomTimeLimit) {
  const { shown, refusal, change } = useRoomSetting({ current: timeLimitSeconds, revision }, async (chosen: TimeLimit) =>
    (await requestTimeLimit(roomId, chosen)) ? 'accepted' : 'failed',
  );
  return { shown, hasFailed: refusal === 'failed', change };
}
