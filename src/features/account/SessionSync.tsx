'use client';

import { useCrossTabRefresh } from '@/components/use-cross-tab-refresh';
import { useReloadWhenRestored } from '@/components/use-reload-when-restored';

// The session cookie is shared by every tab, so a sign-up, log-in or log-out in one tab refreshes the header and page of the others.
export function SessionSync({ identityKey }: { identityKey: string }) {
  useCrossTabRefresh('poketype-session', identityKey);
  useReloadWhenRestored();
  return null;
}
