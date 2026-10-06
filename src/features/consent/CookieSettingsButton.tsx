'use client';

import type { MouseEvent } from 'react';
import { requestCookieSettings } from './open-cookie-settings';

// Closing an enclosing sheet first lets focus return to its trigger once the cookie dialog closes.
function openFrom(event: MouseEvent<HTMLButtonElement>): void {
  event.currentTarget.closest('dialog')?.close();
  requestCookieSettings();
}

export function CookieSettingsButton({ label, className }: { label: string; className: string }) {
  return (
    <button type="button" aria-haspopup="dialog" onClick={openFrom} className={className}>
      {label}
    </button>
  );
}
