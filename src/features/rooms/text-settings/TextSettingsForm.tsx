'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { gameConfig } from '@/config/game';
import type { RoomSnapshot } from '@/domain/room-view';
import { lengthPresets, textLanguages, textOptions, usesAccentOption, type TextOption, type TextSettings } from '@/domain/text-settings';
import { useTextSettings } from './use-text-settings';

type FieldProps = { settings: TextSettings; onChange: (settings: TextSettings) => void };

export function TextSettingsForm({ snapshot }: { snapshot: RoomSnapshot }) {
  const t = useTranslations('TextSettings');
  const { shown, hasFailed, change } = useTextSettings(snapshot);
  return (
    <div className="grid gap-4">
      <LanguageField settings={shown} onChange={change} />
      <LengthField settings={shown} onChange={change} />
      <OptionsField settings={shown} onChange={change} />
      {hasFailed && <p role="alert" className="font-bold text-error">{t('failed')}</p>}
    </div>
  );
}

function LanguageField({ settings, onChange }: FieldProps) {
  const t = useTranslations('TextSettings');
  const name = useId();
  return (
    <fieldset className="visibility-choice">
      <legend className="font-pixel font-semibold">{t('languageLegend')}</legend>
      <div className="settings-pair">
        {textLanguages.map((language) => (
          <ChoiceCard key={language} name={name} label={t(language)} isSelected={settings.language === language} onSelect={() => onChange({ ...settings, language })} />
        ))}
      </div>
    </fieldset>
  );
}

// The presets and the slider set the same value: a preset shows as chosen only while the slider sits on it.
function LengthField({ settings, onChange }: FieldProps) {
  const t = useTranslations('TextSettings');
  const name = useId();
  const sliderId = useId();
  const { minLength, maxLength, lengthStep } = gameConfig.text;
  return (
    <fieldset className="visibility-choice">
      <legend className="font-pixel font-semibold">{t('lengthLegend')}</legend>
      <div className="settings-presets">
        {lengthPresets.map((preset) => {
          const length = gameConfig.text.lengthPresets[preset];
          return <ChoiceCard key={preset} name={name} label={t(preset)} isSelected={settings.length === length} onSelect={() => onChange({ ...settings, length })} />;
        })}
      </div>
      <label htmlFor={sliderId} className="text-sm">{t('lengthSlider')}</label>
      <div className="settings-slider">
        <input id={sliderId} type="range" min={minLength} max={maxLength} step={lengthStep} value={settings.length} onChange={(event) => onChange({ ...settings, length: Number(event.target.value) })} />
        <output htmlFor={sliderId} className="font-bold">{t('lengthValue', { count: settings.length })}</output>
      </div>
    </fieldset>
  );
}

// Accents only change a French text, so the switch is off-limits while the text is English.
function OptionsField({ settings, onChange }: FieldProps) {
  const t = useTranslations('TextSettings');
  return (
    <fieldset className="grid gap-2">
      <legend className="font-pixel font-semibold">{t('optionsLegend')}</legend>
      {textOptions.map((option) => (
        <OptionSwitch key={option} option={option} settings={settings} isAvailable={option !== 'accents' || usesAccentOption(settings.language)} onChange={onChange} />
      ))}
    </fieldset>
  );
}

type OptionSwitchProps = FieldProps & { option: TextOption; isAvailable: boolean };

function OptionSwitch({ option, settings, isAvailable, onChange }: OptionSwitchProps) {
  const t = useTranslations('TextSettings');
  const inputId = useId();
  return (
    <div className="settings-option">
      <input id={inputId} type="checkbox" checked={settings[option]} disabled={!isAvailable} aria-describedby={`${inputId}-hint`} onChange={(event) => onChange({ ...settings, [option]: event.target.checked })} />
      <label htmlFor={inputId} className="font-bold">{t(option)}</label>
      <span id={`${inputId}-hint`} className="text-sm">{t(`${option}Hint`)}</span>
    </div>
  );
}

type ChoiceCardProps = { name: string; label: string; isSelected: boolean; onSelect: () => void };

function ChoiceCard({ name, label, isSelected, onSelect }: ChoiceCardProps) {
  const inputId = useId();
  return (
    <div className="visibility-option" data-state={isSelected ? 'current' : undefined}>
      <input id={inputId} type="radio" name={name} checked={isSelected} onChange={onSelect} />
      <label htmlFor={inputId} className="visibility-face"><span className="font-pixel font-bold">{label}</span></label>
    </div>
  );
}
