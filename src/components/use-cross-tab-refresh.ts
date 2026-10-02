'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useTransition } from 'react';
import { shouldRefreshOnAnnouncement } from './cross-tab-rule';

// A tab announces its value when it changes and again after each refresh it started on hearing a different value,
// so a tab left on a stale value hears the saved one even when the refreshed tab's own value did not change.
export function useCrossTabRefresh(channelName: string, value: string): void {
  const router = useRouter();
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [isRefreshing, startRefresh] = useTransition();
  const wasRefreshing = useRef(false);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(channelName);
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (shouldRefreshOnAnnouncement(value, event.data)) startRefresh(() => router.refresh());
    };
    channel.postMessage(value);
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [channelName, value, router]);

  useEffect(() => {
    const refreshJustRendered = wasRefreshing.current && !isRefreshing;
    wasRefreshing.current = isRefreshing;
    if (refreshJustRendered) channelRef.current?.postMessage(value);
  }, [isRefreshing, value]);
}
