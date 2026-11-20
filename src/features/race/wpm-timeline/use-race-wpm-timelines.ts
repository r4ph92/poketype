'use client';

import { useEffect, useState } from 'react';
import { gameConfig } from '@/config/game';
import { parseRaceWpmTimelines, type RaceWpmTimelines } from '@/domain/wpm-timeline';

export type WpmTimelinesState = RaceWpmTimelines | { kind: 'loading' } | { kind: 'failed'; retry: () => void };

type LoadOutcome = RaceWpmTimelines | 'failed';

const loading: WpmTimelinesState = { kind: 'loading' };

// The live results read the timelines once per race, apart from the polled snapshot; a failure offers a retry instead of polling.
export function useRaceWpmTimelines(roomId: string, raceId: string): WpmTimelinesState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<WpmTimelinesState>(loading);
  useEffect(() => {
    const controller = new AbortController();
    void loadTimelines(roomId, raceId, controller.signal).then((outcome) => {
      if (controller.signal.aborted) return;
      const retry = () => {
        setState(loading);
        setAttempt((previous) => previous + 1);
      };
      setState(outcome === 'failed' ? { kind: 'failed', retry } : outcome);
    });
    return () => controller.abort();
  }, [roomId, raceId, attempt]);
  return state;
}

async function loadTimelines(roomId: string, raceId: string, signal: AbortSignal): Promise<LoadOutcome> {
  try {
    const response = await fetch(`/api/rooms/${roomId}/races/${raceId}/wpm`, { cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(gameConfig.wpmTimeline.requestTimeoutMs)]) });
    if (!response.ok) return 'failed';
    return parseRaceWpmTimelines(await response.json()) ?? 'failed';
  } catch {
    return 'failed';
  }
}
