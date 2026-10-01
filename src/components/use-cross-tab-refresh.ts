'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Each tab announces its value on the channel; a tab that hears a different value refreshes from the server.
export function useCrossTabRefresh(channelName: string, value: string): void {
  const router = useRouter();
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(channelName);
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (event.data !== value) router.refresh();
    };
    channel.postMessage(value);
    return () => channel.close();
  }, [channelName, value, router]);
}
