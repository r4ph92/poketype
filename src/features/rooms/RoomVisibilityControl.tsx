'use client';

import { useTranslations } from 'next-intl';
import { ProgressBadge } from '@/components/pixel/ProgressBadge';
import { isViewerHost, type RoomSnapshot } from '@/domain/room-view';
import type { RoomVisibility } from '@/domain/room-visibility';
import { useRoomVisibility } from './access/use-room-visibility';
import { VisibilityChoice, visibilityHintKey } from './access/VisibilityChoice';

export function RoomVisibilityControl({ snapshot }: { snapshot: RoomSnapshot }) {
  if (isViewerHost(snapshot)) return <HostVisibilitySwitch snapshot={snapshot} />;
  return <VisibilityStatus visibility={snapshot.visibility} />;
}

function HostVisibilitySwitch({ snapshot }: { snapshot: RoomSnapshot }) {
  const t = useTranslations('Lobby');
  const { shown, hasFailed, choose } = useRoomVisibility(snapshot);
  return (
    <div className="grid gap-2">
      <VisibilityChoice name="room-visibility" selected={shown} onChoose={choose} />
      {hasFailed && <p role="alert" className="font-bold text-error">{t('visibilityFailed')}</p>}
    </div>
  );
}

function VisibilityStatus({ visibility }: { visibility: RoomVisibility }) {
  const t = useTranslations('RoomAccess');
  return (
    <div className="grid gap-2">
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-pixel font-semibold">{t('visibilityLegend')}</span>
        <ProgressBadge>{t(visibility)}</ProgressBadge>
      </p>
      <p className="text-sm">{t(visibilityHintKey[visibility])}</p>
    </div>
  );
}
