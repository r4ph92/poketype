'use client';

import { useTranslations } from 'next-intl';
import { textLanguages, type TextLanguage } from '@/domain/text-settings';
import type { PublicRoomFilter } from '@/domain/public-room-filter';

type PublicRoomFiltersProps = { filter: PublicRoomFilter; onChange: (filter: PublicRoomFilter) => void };

const faceClass =
  'pixel-frame-thin pixel-notch flex flex-1 items-center justify-center px-3 font-pixel text-base font-semibold uppercase tracking-[0.06em]';
const currentFaceClass = 'marker-check bg-gold text-on-gold';
const idleFaceClass = 'bg-cream text-ink group-hover:bg-cream-deep';

// Each filter is one fieldset of toggle buttons; the complexity filter (#152) is a second fieldset here.
export function PublicRoomFilters({ filter, onChange }: PublicRoomFiltersProps) {
  return <LanguageFilter selected={filter.language} onSelect={(language) => onChange({ ...filter, language })} />;
}

function LanguageFilter({ selected, onSelect }: { selected: TextLanguage | undefined; onSelect: (language: TextLanguage | undefined) => void }) {
  const t = useTranslations('PublicRooms');
  const choices: { value: TextLanguage | undefined; name: string }[] = [
    { value: undefined, name: t('filterAll') },
    ...textLanguages.map((language) => ({ value: language, name: t(`languages.${language}`) })),
  ];
  return (
    <fieldset className="min-w-0">
      <legend className="float-left me-2 flex min-h-11 items-center font-pixel font-semibold">{t('languageFilter')}</legend>
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
