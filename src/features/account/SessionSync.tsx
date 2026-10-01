'use client';

import { useCrossTabRefresh } from '@/components/use-cross-tab-refresh';

// The session cookie is shared by every tab, so a sign-up or log-out in one tab refreshes the header and page of the others.
export function SessionSync({ identityKey }: { identityKey: string }) {
  useCrossTabRefresh('poketype-session', identityKey);
  return null;
}
