'use client';

import { useTranslations } from 'next-intl';
import { ConsentChoiceButton } from './ConsentChoiceButton';

type ConsentDetailsProps = { id: string; isVisible: boolean; keepsPreferences: boolean; onKeepsPreferencesChange: (keepsPreferences: boolean) => void };

export function ConsentDetails({ id, isVisible, keepsPreferences, onKeepsPreferencesChange }: ConsentDetailsProps) {
  const t = useTranslations('CookieConsent');
  return (
    <div id={id} hidden={!isVisible} className="grid gap-4 border-t-2 border-slate pt-4">
      <section className="grid gap-1">
        <h3 className="font-pixel text-base font-bold">{t('necessaryTitle')}</h3>
        <p>{t('necessaryText')}</p>
      </section>
      <section className="grid gap-2">
        <h3 className="font-pixel text-base font-bold">{t('preferencesTitle')}</h3>
        <p>{t('preferencesText')}</p>
        <label className="flex min-h-11 items-center gap-3 font-pixel font-semibold">
          <input type="checkbox" role="switch" name="preferences" checked={keepsPreferences} onChange={(event) => onKeepsPreferencesChange(event.target.checked)} className="consent-switch" />
          {t('preferencesSwitch')}
        </label>
      </section>
      <ConsentChoiceButton choice="save" label={t('save')} />
    </div>
  );
}
