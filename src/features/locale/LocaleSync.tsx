'use client';

import { useCrossTabRefresh } from '@/components/use-cross-tab-refresh';
import type { Locale } from '@/i18n/config';

// The locale cookie is httpOnly and a client navigation keeps the old root layout, so other tabs are told to refresh.
export function LocaleSync({ locale }: { locale: Locale }) {
  useCrossTabRefresh('poketype-locale', locale);
  return null;
}
