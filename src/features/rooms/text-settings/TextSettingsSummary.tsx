'use client';

import { useTranslations } from 'next-intl';
import { textOptions, usesAccentOption, usesDigitsOption, type TextSettings } from '@/domain/text-settings';

export function TextSettingsSummary({ settings }: { settings: TextSettings }) {
  const t = useTranslations('TextSettings');
  const shownOptions = textOptions.filter((option) => (option !== 'accents' || usesAccentOption(settings.language)) && (option !== 'digits' || usesDigitsOption(settings.kind)));
  return (
    <dl className="settings-summary">
      <div><dt>{t('kindLegend')}</dt><dd>{t(settings.kind)}</dd></div>
      <div><dt>{t('errorModeLegend')}</dt><dd>{t(settings.errorMode)}</dd></div>
      <div><dt>{t('languageLegend')}</dt><dd>{t(settings.language)}</dd></div>
      <div><dt>{t('lengthLegend')}</dt><dd>{t('lengthValue', { count: settings.length })}</dd></div>
      {settings.kind === 'random' && <div><dt>{t('includeLegend')}</dt><PickedCharacters characters={settings.include} /></div>}
      {settings.kind === 'random' && <div><dt>{t('excludeLegend')}</dt><PickedCharacters characters={settings.exclude} /></div>}
      {shownOptions.map((option) => (
        <div key={option}><dt>{t(option)}</dt><dd>{t(settings[option] ? 'optionOn' : 'optionOff')}</dd></div>
      ))}
    </dl>
  );
}

// The characters are data, drawn by CSS from data-character; the list's name reads them out.
function PickedCharacters({ characters }: { characters: readonly string[] }) {
  const t = useTranslations('TextSettings');
  if (characters.length === 0) return <dd>{t('noPicks')}</dd>;
  return (
    <dd role="img" aria-label={t('picksAccessible', { characters: characters.join(' ') })} className="flex flex-wrap gap-1">
      {characters.map((character) => <span key={character} className="pick-character" data-character={character} />)}
    </dd>
  );
}
