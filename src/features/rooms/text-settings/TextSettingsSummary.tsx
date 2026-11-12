'use client';

import { useTranslations } from 'next-intl';
import { textOptions, usesAccentOption, usesDigitsOption, type TextSettings } from '@/domain/text-settings';

export function TextSettingsSummary({ settings }: { settings: TextSettings }) {
  const t = useTranslations('TextSettings');
  const shownOptions = textOptions.filter((option) => (option !== 'accents' || usesAccentOption(settings.language)) && (option !== 'digits' || usesDigitsOption(settings.kind)));
  return (
    <dl className="settings-summary">
      <div><dt>{t('kindLegend')}</dt><dd>{t(settings.kind)}</dd></div>
      <div><dt>{t('languageLegend')}</dt><dd>{t(settings.language)}</dd></div>
      <div><dt>{t('lengthLegend')}</dt><dd>{t('lengthValue', { count: settings.length })}</dd></div>
      {shownOptions.map((option) => (
        <div key={option}><dt>{t(option)}</dt><dd>{t(settings[option] ? 'optionOn' : 'optionOff')}</dd></div>
      ))}
    </dl>
  );
}
