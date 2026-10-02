'use client';

import { useTranslations } from 'next-intl';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { isViewerHost, type RoomSnapshot } from '@/domain/room-view';
import { TextSettingsForm } from './TextSettingsForm';
import { TextSettingsSummary } from './TextSettingsSummary';

// Everyone sees the settings the next race will use; only the host can change them.
export function TextSettingsPanel({ snapshot }: { snapshot: RoomSnapshot }) {
  const t = useTranslations('TextSettings');
  const isHost = isViewerHost(snapshot);
  return (
    <PixelPanel titleId="race-text-title" title={t('title')}>
      <div className="grid gap-4">
        <p className="text-sm">{t(isHost ? 'hostHint' : 'guestHint')}</p>
        {isHost ? <TextSettingsForm snapshot={snapshot} /> : <TextSettingsSummary settings={snapshot.textSettings} />}
      </div>
    </PixelPanel>
  );
}
