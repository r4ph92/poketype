'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { roomVisibilities, type RoomVisibility } from '@/domain/room-visibility';

type VisibilityChoiceProps = { name: string; selected: RoomVisibility; onChoose: (visibility: RoomVisibility) => void };

export const visibilityHintKey = { public: 'publicHint', unlisted: 'unlistedHint' } as const;

export function VisibilityChoice({ name, selected, onChoose }: VisibilityChoiceProps) {
  const t = useTranslations('RoomAccess');
  const idPrefix = useId();
  return (
    <fieldset className="visibility-choice">
      <legend className="font-pixel font-semibold">{t('visibilityLegend')}</legend>
      {roomVisibilities.map((visibility) => {
        const inputId = `${idPrefix}-${visibility}`;
        return (
          <div key={visibility} className="visibility-option" data-state={visibility === selected ? 'current' : undefined}>
            <input
              id={inputId}
              type="radio"
              name={name}
              value={visibility}
              checked={visibility === selected}
              onChange={() => onChoose(visibility)}
              aria-describedby={`${inputId}-hint`}
            />
            <label htmlFor={inputId} className="visibility-face">
              <span className="font-pixel font-bold">{t(visibility)}</span>
              <span id={`${inputId}-hint`} className="text-sm">{t(visibilityHintKey[visibility])}</span>
            </label>
          </div>
        );
      })}
    </fieldset>
  );
}
