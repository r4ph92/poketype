'use client';

import { useTranslations } from 'next-intl';
import { complexityLevels, type ComplexityLevel } from '@/domain/text-complexity';
import { textLanguages, type TextLanguage } from '@/domain/text-settings';
import type { PublicRoomFilter } from '@/domain/public-room-filter';

type PublicRoomFiltersProps = { filter: PublicRoomFilter; onChange: (filter: PublicRoomFilter) => void };

type FilterChoice<Value extends string> = { value: Value | undefined; name: string };

type FilterFieldProps<Value extends string> = { legend: string; choices: FilterChoice<Value>[]; selected: Value | undefined; onSelect: (value: Value | undefined) => void };

const faceClass =
  'pixel-frame-thin pixel-notch flex flex-1 items-center justify-center px-3 font-pixel text-base font-semibold uppercase tracking-[0.06em]';
const currentFaceClass = 'marker-check bg-gold text-on-gold';
const idleFaceClass = 'bg-cream text-ink group-hover:bg-cream-deep';

// Each filter is one fieldset of toggle buttons: "All" plus one button per value.
export function PublicRoomFilters({ filter, onChange }: PublicRoomFiltersProps) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      <LanguageFilter selected={filter.language} onSelect={(language) => onChange({ ...filter, language })} />
      <ComplexityFilter selected={filter.complexity} onSelect={(complexity) => onChange({ ...filter, complexity })} />
    </div>
  );
}

function LanguageFilter({ selected, onSelect }: { selected: TextLanguage | undefined; onSelect: (language: TextLanguage | undefined) => void }) {
  const t = useTranslations('PublicRooms');
  const choices = [{ value: undefined, name: t('filterAll') }, ...textLanguages.map((language) => ({ value: language, name: t(`languages.${language}`) }))];
  return <FilterField legend={t('languageFilter')} choices={choices} selected={selected} onSelect={onSelect} />;
}

function ComplexityFilter({ selected, onSelect }: { selected: ComplexityLevel | undefined; onSelect: (complexity: ComplexityLevel | undefined) => void }) {
  const t = useTranslations('PublicRooms');
  const choices = [{ value: undefined, name: t('filterAll') }, ...complexityLevels.map((level) => ({ value: level, name: t(`complexities.${level}`) }))];
  return <FilterField legend={t('complexityFilter')} choices={choices} selected={selected} onSelect={onSelect} />;
}

function FilterField<Value extends string>({ legend, choices, selected, onSelect }: FilterFieldProps<Value>) {
  return (
    <fieldset className="min-w-0">
      <legend className="float-left me-2 flex min-h-11 items-center font-pixel font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {choices.map(({ value, name }) => (
          <button key={value ?? 'all'} type="button" aria-pressed={value === selected} onClick={() => onSelect(value)} className="group inline-flex min-h-11 min-w-11 items-stretch">
            <span className={`${faceClass} ${value === selected ? currentFaceClass : idleFaceClass}`}>{name}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
