'use client';

import { useEffect, useRef, type ReactNode } from 'react';

type LocaleButtonProps = { locale: string; isCurrent: boolean; children: ReactNode };

const faceClass =
  'pixel-frame-thin pixel-notch flex flex-1 items-center justify-center px-3 font-pixel text-base font-semibold uppercase tracking-[0.06em]';
const currentFaceClass = 'marker-check bg-gold text-on-gold';
const idleFaceClass = 'bg-cream text-ink group-hover:bg-cream-deep';

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
      className="group inline-flex min-h-11 min-w-11 items-stretch"
    >
      <span className={`${faceClass} ${isCurrent ? currentFaceClass : idleFaceClass}`}>{children}</span>
    </button>
  );
}
