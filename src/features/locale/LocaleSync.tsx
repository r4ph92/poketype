'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { Locale } from '@/i18n/config';

const channelName = 'poketype-locale';

// The locale cookie is httpOnly and a client navigation keeps the old root layout, so other tabs are told to refresh.
export function LocaleSync({ locale }: { locale: Locale }) {
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
