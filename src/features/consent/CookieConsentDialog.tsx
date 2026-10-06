'use client';

import { useTranslations } from 'next-intl';
import { useId, type SyntheticEvent } from 'react';
import { useCrossTabRefresh } from '@/components/use-cross-tab-refresh';
import { ConsentChoiceButton } from './ConsentChoiceButton';
import { ConsentDetails } from './ConsentDetails';
import { allowsPreferenceStorage, type ConsentLevel } from './consent-level';
import { applyPreferenceConsent } from './preference-storage';
import { saveCookieConsent } from './save-cookie-consent';
import { useCookieSettingsDialog } from './use-cookie-settings-dialog';

// The consent cookie is httpOnly, so the server tells this dialog whether a choice exists and other tabs refresh to hear it.
export function CookieConsentDialog({ level }: { level: ConsentLevel | null }) {
  const t = useTranslations('CookieConsent');
  const titleId = useId();
  const detailsId = useId();
  const { dialog, heading, isCustomizing, setCustomizing, keepsPreferences, setKeepsPreferences } = useCookieSettingsDialog(level);
  const mustChoose = level === null;
  useCrossTabRefresh('poketype-consent', level ?? 'unset');

  async function save(formData: FormData): Promise<void> {
    applyPreferenceConsent(allowsPreferenceStorage(await saveCookieConsent(formData)));
    dialog.current?.close();
  }

  function refuseCloseWithoutChoice(event: SyntheticEvent<HTMLDialogElement>): void {
    if (mustChoose) event.preventDefault();
  }

  return (
    <dialog ref={dialog} aria-labelledby={titleId} closedby={mustChoose ? 'none' : 'closerequest'} onCancel={refuseCloseWithoutChoice} className="confirm-dialog cookie-consent pixel-frame text-ink">
      <form action={save} className="grid gap-4">
        <h2 id={titleId} ref={heading} tabIndex={-1} className="font-pixel text-xl font-bold">{t('title')}</h2>
        <p>{t('intro')}</p>
        <div className="flex flex-wrap gap-3">
          <ConsentChoiceButton choice="accept" label={t('accept')} />
          <ConsentChoiceButton choice="refuse" label={t('refuse')} />
        </div>
        <button type="button" aria-expanded={isCustomizing} aria-controls={detailsId} onClick={() => setCustomizing(!isCustomizing)} className="min-h-11 justify-self-start font-pixel font-semibold underline">
          {t('customize')}
        </button>
        <ConsentDetails id={detailsId} isVisible={isCustomizing} keepsPreferences={keepsPreferences} onKeepsPreferencesChange={setKeepsPreferences} />
      </form>
    </dialog>
  );
}
