'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { isViewerHost, type RoomSnapshot } from '@/domain/room-view';
import { ChoiceCard } from '../text-settings/TextSettingsForm';
import { useRoomSetting } from '../use-room-setting';
import { requestCatchUpBonuses } from './request-catch-up-bonuses';

// "Bonus de remontée" (CONF-09): everyone sees whether the next race gives them; only the host switches them, in the waiting room.
export function CatchUpBonusPanel({ snapshot }: { snapshot: RoomSnapshot }) {
  const t = useTranslations('TextSettings');
  return (
    <PixelPanel titleId="catch-up-bonuses-title" title={t('catchUpTitle')}>
      {isViewerHost(snapshot) ? <CatchUpBonusForm snapshot={snapshot} /> : <p className="font-bold">{t(snapshot.catchUpBonuses ? 'catchUpOn' : 'catchUpOff')}</p>}
      <p className="text-sm">{t('catchUpHint')}</p>
    </PixelPanel>
  );
}

function CatchUpBonusForm({ snapshot }: { snapshot: RoomSnapshot }) {
  const t = useTranslations('TextSettings');
  const name = useId();
  const { roomId, catchUpBonuses, revision } = snapshot;
  const { shown, refusal, change } = useRoomSetting({ current: catchUpBonuses, revision }, async (isEnabled: boolean) => ((await requestCatchUpBonuses(roomId, isEnabled)) ? 'accepted' : 'failed'));
  return (
    <div className="grid gap-2">
      <fieldset className="visibility-choice">
        <legend className="font-pixel font-semibold">{t('catchUpLegend')}</legend>
        <div className="settings-pair">
          <ChoiceCard name={name} label={t('catchUpOff')} isSelected={!shown} onSelect={() => change(false)} />
          <ChoiceCard name={name} label={t('catchUpOn')} isSelected={shown} onSelect={() => change(true)} />
        </div>
      </fieldset>
      {refusal === 'failed' && <p role="alert" className="font-bold text-error">{t('catchUpFailed')}</p>}
    </div>
  );
}
