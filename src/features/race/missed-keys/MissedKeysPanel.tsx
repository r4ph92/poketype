'use client';

import { useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { BallIcon } from '@/components/pixel/icons/icons';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { gameConfig } from '@/config/game';
import { keyboardHeatOf } from '@/domain/keyboard-heat';
import { keyboardLayoutIds, keyboardLayouts, type KeyboardLayoutId } from '@/domain/keyboard-layouts';
import type { MissedCharacter } from '@/domain/missed-characters';
import { defaultKeyboardLayout } from './default-keyboard-layout';
import { HeatLegend } from './HeatLegend';
import { KeyboardHeatMap } from './KeyboardHeatMap';
import { characterName } from './character-name';

// missedKeys is the viewer's own, most missed first; null when the race kept no record.
type MissedKeysPanelProps = { missedKeys: MissedCharacter[] | null };

export function MissedKeysPanel({ missedKeys }: MissedKeysPanelProps) {
  const t = useTranslations('Room');
  return (
    <PixelPanel titleId="missed-keys-title" title={<span className="results-panel-title"><BallIcon />{t('missedKeysHeading')}</span>}>
      {missedKeys === null && <p>{t('missedKeysUnrecorded')}</p>}
      {missedKeys?.length === 0 && <p data-no-missed-keys>{t('missedKeysNone')}</p>}
      {missedKeys && missedKeys.length > 0 && <MissedKeysDetails missedKeys={missedKeys} />}
    </PixelPanel>
  );
}

function MissedKeysDetails({ missedKeys }: { missedKeys: MissedCharacter[] }) {
  const t = useTranslations('Room');
  const locale = useLocale();
  const [layoutId, setLayoutId] = useState<KeyboardLayoutId>(defaultKeyboardLayout(locale));
  const heat = keyboardHeatOf(keyboardLayouts[layoutId], missedKeys);
  return (
    <div className="missed-keys">
      <MissedKeysList missedKeys={missedKeys} />
      <LayoutPicker layoutId={layoutId} onChange={setLayoutId} />
      <KeyboardHeatMap layout={keyboardLayouts[layoutId]} heat={heat} label={t('missedKeysMapLabel', { layout: t(`keyboardLayouts.${layoutId}`) })} />
      <HeatLegend maxCount={heat.maxCount} />
      {heat.unplaced.length > 0 && <p className="text-sm text-muted">{t('missedKeysUnplaced', { characters: heat.unplaced.map(({ character }) => character).join(' ') })}</p>}
      <p className="text-sm text-muted">{t('missedKeysDeadKeyHint')}</p>
    </div>
  );
}

function MissedKeysList({ missedKeys }: { missedKeys: MissedCharacter[] }) {
  const t = useTranslations('Room');
  return (
    <ol className="missed-keys-list" aria-label={t('missedKeysHeading')}>
      {missedKeys.slice(0, gameConfig.missedKeys.listedCount).map(({ character, count }) => (
        <li key={character}>
          <kbd>{characterName(character, t('spaceCharacter'))}</kbd>
          <span>{t('missedKeyCount', { count })}</span>
        </li>
      ))}
    </ol>
  );
}

type LayoutPickerProps = { layoutId: KeyboardLayoutId; onChange: (layoutId: KeyboardLayoutId) => void };

function LayoutPicker({ layoutId, onChange }: LayoutPickerProps) {
  const t = useTranslations('Room');
  const selectId = useId();
  return (
    <div className="missed-keys-picker">
      <label htmlFor={selectId}>{t('missedKeysLayout')}</label>
      <select id={selectId} value={layoutId} onChange={(event) => onChange(event.target.value as KeyboardLayoutId)}>
        {keyboardLayoutIds.map((id) => <option key={id} value={id}>{t(`keyboardLayouts.${id}`)}</option>)}
      </select>
    </div>
  );
}
