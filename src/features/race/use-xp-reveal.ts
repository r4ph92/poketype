'use client';

import { useEffect, useState } from 'react';
import type { XpRewardFrame } from './xp-reward-frames';

// isAnimated stays true after the last frame so its own animation can finish; isFinal tells the final frame is showing.
export type XpReveal = { frame: XpRewardFrame; isAnimated: boolean; isFinal: boolean };

// Plays the frames once. When play is off from the start (a refresh, reduced motion) or turns off midway, the final frame shows for good.
export function useXpReveal(frames: readonly XpRewardFrame[], play: boolean): XpReveal {
  const last = frames.length - 1;
  const [index, setIndex] = useState(0);
  const [isStopped, setStopped] = useState(!play);
  if (!play && !isStopped) setStopped(true);
  useEffect(() => {
    if (isStopped || index >= last) return;
    const timer = window.setTimeout(() => setIndex(index + 1), frames[index]!.durationMs);
    return () => window.clearTimeout(timer);
  }, [isStopped, index, last, frames]);
  const shown = isStopped ? last : index;
  return { frame: frames[shown]!, isAnimated: !isStopped, isFinal: shown === last };
}
