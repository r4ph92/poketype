'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const channelName = 'poketype-locale';

export function LocaleSync({ locale }: { locale: string }) {
  const router = useRouter();
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(channelName);
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (event.data !== locale) router.refresh();
    };
    channel.postMessage(locale);
    return () => channel.close();
  }, [locale, router]);
  return null;
}
