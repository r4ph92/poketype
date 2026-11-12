'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { isViewerHost, type RoomSnapshot } from '@/domain/room-view';
import { defaultTimeLimit, timeLimitRange, type TimeLimit } from '@/domain/time-limit';
import { ChoiceCard } from '../text-settings/TextSettingsForm';
import { useTimeLimit } from './use-time-limit';

// "Temps maximal" (CONF-01): everyone sees the limit the next race will use; only the host changes it, in the waiting room.
export function TimeLimitPanel({ snapshot }: { snapshot: RoomSnapshot }) {
  const t = useTranslations('TextSettings');
  return (
    <PixelPanel titleId="time-limit-title" title={t('timeLimitTitle')}>
      {isViewerHost(snapshot) ? <TimeLimitForm snapshot={snapshot} /> : <p className="font-bold">{timeLimitLabel(t, snapshot.timeLimitSeconds)}</p>}
    </PixelPanel>
  );
}

function TimeLimitForm({ snapshot }: { snapshot: RoomSnapshot }) {
  const t = useTranslations('TextSettings');
  const name = useId();
  const sliderId = useId();
  const { shown, hasFailed, change } = useTimeLimit(snapshot);
  const { minSeconds, maxSeconds, stepSeconds } = timeLimitRange;
  return (
    <div className="grid gap-4">
      <fieldset className="visibility-choice">
        <legend className="font-pixel font-semibold">{t('timeLimitLegend')}</legend>
        <div className="settings-pair">
          <ChoiceCard name={name} label={t('timeLimitNone')} isSelected={shown === null} onSelect={() => change(null)} />
          <ChoiceCard name={name} label={t('timeLimitSet')} isSelected={shown !== null} onSelect={() => change(shown ?? defaultTimeLimit)} />
        </div>
      </fieldset>
      {shown === null ? (
        <p className="text-sm">{t('timeLimitNoneHint')}</p>
      ) : (
        <div className="grid gap-2">
          <label htmlFor={sliderId} className="text-sm">{t('timeLimitSlider')}</label>
          <div className="settings-slider">
            <input id={sliderId} type="range" min={minSeconds} max={maxSeconds} step={stepSeconds} value={shown} aria-valuetext={durationLabel(t, shown)} onChange={(event) => change(Number(event.target.value))} />
            <output htmlFor={sliderId} className="font-bold">{durationLabel(t, shown)}</output>
          </div>
        </div>
      )}
      {hasFailed && <p role="alert" className="font-bold text-error">{t('timeLimitFailed')}</p>}
    </div>
  );
}

type SettingsTranslator = ReturnType<typeof useTranslations<'TextSettings'>>;

function timeLimitLabel(t: SettingsTranslator, timeLimitSeconds: TimeLimit): string {
  return timeLimitSeconds === null ? t('timeLimitNone') : t('timeLimitValue', { time: durationLabel(t, timeLimitSeconds) });
}

// "5 min", "4 min 30 s" or "30 s": words a child reads at once, rather than a clock.
function durationLabel(t: SettingsTranslator, totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return t('durationSeconds', { seconds });
  return seconds === 0 ? t('durationMinutes', { minutes }) : t('durationMinutesSeconds', { minutes, seconds });
}
