'use client';

import { useTranslations } from 'next-intl';
import { isViewerSpectator, type RoomSnapshot } from '@/domain/room-view';
import { HostRoleChoice } from './HostRoleChoice';
import { useHostRole } from './use-host-role';

// The host's own choice, in the waiting room and on the results; everyone else sees the badge on the host's card.
export function HostRolePanel({ snapshot, isLegendHidden = false }: { snapshot: RoomSnapshot; isLegendHidden?: boolean }) {
  const t = useTranslations('HostRole');
  const { shown, refusal, choose } = useHostRole({ roomId: snapshot.roomId, role: isViewerSpectator(snapshot) ? 'spectator' : 'participant', revision: snapshot.revision });
  return (
    <div className="grid gap-2">
      <HostRoleChoice name="host-role" selected={shown} onChoose={choose} isLegendHidden={isLegendHidden} />
      {refusal && <p role="alert" className="font-bold text-error">{t(refusal === 'full' ? 'noSeat' : 'changeFailed')}</p>}
    </div>
  );
}
