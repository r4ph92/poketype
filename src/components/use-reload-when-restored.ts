'use client';

import { useEffect } from 'react';

// A page brought back by Back or Forward from the back-forward cache or the HTTP cache never asks the server,
// so it would still show the identity it had before a log-out. Production pages are no-store; the dev server's are not.
export function useReloadWhenRestored(): void {
  useEffect(() => {
    if (wasLoadedFromHistoryCache()) {
      window.location.reload();
      return;
    }
    function reloadRestoredPage(event: PageTransitionEvent): void {
      if (event.persisted) window.location.reload();
    }
    window.addEventListener('pageshow', reloadRestoredPage);
    return () => window.removeEventListener('pageshow', reloadRestoredPage);
  }, []);
}

function wasLoadedFromHistoryCache(): boolean {
  const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  return navigation?.type === 'back_forward' && navigation.transferSize === 0;
}
