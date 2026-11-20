'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { passageCharacters } from '@/domain/passage';
import type { AcceptedProgress } from '@/domain/progress-report';
import type { RoomId } from '@/domain/room-id';
import type { RaceView } from '@/domain/room-view';
import { applyInput, isPassageFinished, startTypingFrom, typingReportOf, untypedState, type TypingInput, type TypingState } from '@/domain/typing-progress';
import { createBrowserProgressReporter } from './browser-progress-reporter';
import type { ProgressReporter } from './progress-reporter';

export type TypingRace = {
  characters: readonly string[];
  state: TypingState;
  isFinished: boolean;
  serverFinishMs: number | null;
  type: (input: TypingInput) => void;
};

const noProgress: AcceptedProgress = { lastSequence: 0, position: 0, correctCharacters: 0, keystrokes: 0, rejectedKeystrokes: 0 };

// The server's resume data seeds the counters once per race (the view is keyed by race id); afterwards local typing drives the screen.
// text is the viewer's own text, which a catch-up bonus may shorten during the race.
export function useTypingRace(roomId: RoomId, race: RaceView, text: string, canType: boolean): TypingRace {
  const characters = useMemo(() => passageCharacters(text), [text]);
  const [resumeFrom] = useState(() => race.viewer ?? noProgress);
  const [state, setState] = useState(() => (race.viewer ? startTypingFrom(race.viewer) : untypedState));
  const [serverFinishMs, setServerFinishMs] = useState<number | null>(null);
  const reporter = useProgressReporter(roomId, resumeFrom, setServerFinishMs);
  const latestState = useRef(state);

  function type(input: TypingInput): void {
    if (!canType) return;
    const next = applyInput(latestState.current, characters, input, race.errorMode);
    if (next === latestState.current) return;
    latestState.current = next;
    setState(next);
    reporter.current?.update(typingReportOf(next));
  }

  return { characters, state, isFinished: isPassageFinished(state, characters), serverFinishMs, type };
}

function useProgressReporter(roomId: RoomId, resumeFrom: AcceptedProgress, onFinishTime: (finishMs: number | null) => void): RefObject<ProgressReporter | null> {
  const reporter = useRef<ProgressReporter | null>(null);
  useEffect(() => {
    const created = createBrowserProgressReporter(roomId, resumeFrom, (progress) => onFinishTime(progress.finishMs));
    reporter.current = created;
    return () => created.dispose();
  }, [roomId, resumeFrom, onFinishTime]);
  return reporter;
}
