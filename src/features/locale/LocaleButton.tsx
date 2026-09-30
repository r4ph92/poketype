'use client';

import { useEffect, useRef, type ReactNode } from 'react';

type LocaleButtonProps = { locale: string; isCurrent: boolean; children: ReactNode };

// The page may remount the buttons after the switch, which drops focus; this module-level memory survives the remount.
let localeAwaitingFocus: string | null = null;

export function LocaleButton({ locale, isCurrent, children }: LocaleButtonProps) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isCurrent || localeAwaitingFocus !== locale) return;
    localeAwaitingFocus = null;
    button.current?.focus();
  }, [isCurrent, locale]);
  return (
    <button
      ref={button}
      type="submit"
      name="locale"
      value={locale}
      onClick={() => {
        localeAwaitingFocus = locale;
      }}
      aria-current={isCurrent ? 'true' : undefined}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1 border-4 border-ink px-3 font-bold ${isCurrent ? 'bg-gold' : 'bg-cream'}`}
    >
      {children}
    </button>
  );
}
