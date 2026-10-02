'use client';

import { useSyncExternalStore } from 'react';

function subscribeToNothing(): () => void {
  return () => {};
}

// False on the server and during hydration, true afterwards: for content that only works with JavaScript, like a portal into document.body.
export function useIsHydrated(): boolean {
  return useSyncExternalStore(subscribeToNothing, () => true, () => false);
}
