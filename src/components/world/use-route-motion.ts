'use client';

import { useEffect, useRef, useState } from 'react';
import { useSpriteMotion } from '@/components/pixel/SpriteMotion';

// Interpolate distance along the route, not x/y across corners. Never predicts ahead of received progress.
export function useRouteMotion(target: number, passageLength: number) {
  const enabled = useSpriteMotion();
  const current = useRef(target);
  const lastInput = useRef({ target, time: 0 });
  const [view, setView] = useState({ progress: target, walking: false, playbackRate: 1 });
  useEffect(() => {
    const from = current.current;
    const now = performance.now();
    const previous = lastInput.current;
    const characters = Math.max(0, (target - previous.target) * passageLength);
    const elapsed = previous.time === 0 ? 200 : Math.max(50, now - previous.time);
    // Five correct characters per second is the normal walk cadence (60 WPM).
    // Polling batches use their character delta; unchanged snapshots never move.
    const playbackRate = Math.max(0.5, Math.min(2.5, characters * 1000 / elapsed / 5));
    lastInput.current = { target, time: now };
    let frame = 0;
    let started: number | undefined;
    function tick(time: number) {
      started ??= time;
      const fraction = enabled ? Math.min(1, (time - started) / 160) : 1;
      const progress = from + (target - from) * fraction;
      current.current = progress;
      setView({ progress, walking: enabled && fraction < 1 && target > from, playbackRate });
      if (fraction < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, enabled, passageLength]);
  return view;
}
