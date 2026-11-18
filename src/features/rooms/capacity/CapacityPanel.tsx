'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { roomCapacityRange, type RoomCapacity } from '@/domain/room-capacity';
import { isViewerHost, type RoomSnapshot } from '@/domain/room-view';
import { useRoomSetting } from '../use-room-setting';
import { requestCapacity } from './request-capacity';

const refusalKey = { 'below-racers': 'capacityBelowRacers', failed: 'capacityFailed' } as const;

// "Capacité" (SALLE-05): everyone sees how many racers the room seats; only the host changes it, in the waiting room.
export function CapacityPanel({ snapshot }: { snapshot: RoomSnapshot }) {
  const t = useTranslations('TextSettings');
  return (
    <PixelPanel titleId="capacity-title" title={t('capacityTitle')}>
      {isViewerHost(snapshot) ? <CapacityForm snapshot={snapshot} /> : <p className="font-bold">{t('capacityValue', { capacity: snapshot.capacity })}</p>}
      <p className="text-sm">{t('capacityHint')}</p>
    </PixelPanel>
  );
}

function CapacityForm({ snapshot }: { snapshot: RoomSnapshot }) {
  const t = useTranslations('TextSettings');
  const sliderId = useId();
  const { roomId, capacity, revision, members } = snapshot;
  const { shown, refusal, change } = useRoomSetting({ current: capacity, revision }, (chosen: RoomCapacity) => requestCapacity(roomId, chosen));
  return (
    <div className="grid gap-2">
      <label htmlFor={sliderId} className="text-sm">{t('capacitySlider')}</label>
      <div className="settings-slider">
        <input
          id={sliderId}
          type="range"
          min={roomCapacityRange.minimum}
          max={roomCapacityRange.maximum}
          step={1}
          value={shown}
          aria-valuetext={t('capacityValue', { capacity: shown })}
          onChange={(event) => change(Number(event.target.value))}
        />
        <output htmlFor={sliderId} className="font-bold">{t('capacityValue', { capacity: shown })}</output>
      </div>
      {refusal && <p role="alert" className="font-bold text-error">{t(refusalKey[refusal], { count: members.length })}</p>}
    </div>
  );
}
