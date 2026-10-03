'use client';

import { useEffect, useRef, useState } from 'react';
import { allowsPreferenceStorage, type ConsentLevel } from './consent-level';
import { onCookieSettingsRequested } from './open-cookie-settings';

// Opens by itself while no choice is stored, and again whenever the footer or the settings ask for it.
export function useCookieSettingsDialog(level: ConsentLevel | null) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [isCustomizing, setCustomizing] = useState(false);
  const [keepsPreferences, setKeepsPreferences] = useState(allowsPreferenceStorage(level));

  useEffect(() => {
    function open(): void {
      setCustomizing(false);
      setKeepsPreferences(allowsPreferenceStorage(level));
      if (!dialog.current?.open) dialog.current?.showModal();
      heading.current?.focus();
    }
    if (level === null) open();
    return onCookieSettingsRequested(open);
  }, [level]);

  return { dialog, heading, isCustomizing, setCustomizing, keepsPreferences, setKeepsPreferences };
}
