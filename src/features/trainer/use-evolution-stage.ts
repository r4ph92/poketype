'use client';

import { useEffect, useState } from 'react';
import { xpRevealTimings, type EvolutionStage } from '@/features/race/xp-reward-frames';

// The old form flashes, then the new one arrives; without motion (reduced motion, a paused scene) the new form shows at once.
export function useEvolutionStage(play: boolean): Exclude<EvolutionStage, 'none'> {
  const [hasArrived, setArrived] = useState(false);
  useEffect(() => {
    if (!play) return;
    const timer = window.setTimeout(() => setArrived(true), xpRevealTimings.evolvingMs);
    return () => window.clearTimeout(timer);
  }, [play]);
  return play && !hasArrived ? 'evolving' : 'evolved';
}
