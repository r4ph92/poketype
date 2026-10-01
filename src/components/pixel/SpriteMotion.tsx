'use client';

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

const MotionContext = createContext(false);
function subscribeMotion(update: () => void) {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  preference.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  return () => {
    preference.removeEventListener('change', update);
    document.removeEventListener('visibilitychange', update);
  };
}
function motionPermitted() {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches && document.visibilityState === 'visible';
}
const serverMotion = () => false;

export function useSpriteMotion() { return useContext(MotionContext); }

// Each scene has a persistent pause control. OS reduced motion always takes precedence.
export function SpriteMotion({ children, showControls = true }: { children: ReactNode; showControls?: boolean }) {
  const t = useTranslations('Animation');
  const permitted = useSyncExternalStore(subscribeMotion, motionPermitted, serverMotion);
  const [paused, setPaused] = useState(false);
  const enabled = permitted && !paused;
  return (
    <MotionContext value={enabled}>
      <div className="sprite-motion" data-motion={enabled ? 'enabled' : 'paused'}>
        {children}
        {showControls && <div className="flex justify-end px-2 py-1">
          <button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)} disabled={!permitted} className="min-h-11 border-2 border-frame bg-cream px-3 font-pixel text-sm text-ink disabled:text-muted">
            {t(!permitted ? 'reduced' : paused ? 'resume' : 'pause')}
          </button>
        </div>}
      </div>
    </MotionContext>
  );
}
