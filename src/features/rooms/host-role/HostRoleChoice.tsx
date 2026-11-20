'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { hostRoles, type HostRole } from '@/domain/host-role';

type HostRoleChoiceProps = { name: string; selected: HostRole; onChoose: (role: HostRole) => void; isDisabled?: boolean; isLegendHidden?: boolean };

const hintKey = { participant: 'participantHint', spectator: 'spectatorHint' } as const;

// Same face as the visibility choice, so the two host decisions read alike (SALLE-01).
export function HostRoleChoice({ name, selected, onChoose, isDisabled = false, isLegendHidden = false }: HostRoleChoiceProps) {
  const t = useTranslations('HostRole');
  const idPrefix = useId();
  return (
    <fieldset className="visibility-choice">
      <legend className={isLegendHidden ? 'sr-only' : 'font-pixel font-semibold'}>{t('legend')}</legend>
      {hostRoles.map((role) => {
        const inputId = `${idPrefix}-${role}`;
        return (
          <div key={role} className="visibility-option" data-state={role === selected ? 'current' : undefined}>
            <input id={inputId} type="radio" name={name} value={role} checked={role === selected} disabled={isDisabled} onChange={() => onChoose(role)} aria-describedby={`${inputId}-hint`} />
            <label htmlFor={inputId} className="visibility-face">
              <span className="font-pixel font-bold">{t(role)}</span>
              <span id={`${inputId}-hint`} className="text-sm">{t(hintKey[role])}</span>
            </label>
          </div>
        );
      })}
    </fieldset>
  );
}
