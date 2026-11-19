'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { ConfirmDialog } from '@/components/pixel/ConfirmDialog';
import type { RoomId } from '@/domain/room-id';
import { requestRemoval } from './request-removal';

type KickPlayerButtonProps = { roomId: RoomId; memberKey: string; name: string };

// The confirmation is the only guard: the server bans the guest for good and checks the host itself. The next snapshot drops the row.
export function KickPlayerButton({ roomId, memberKey, name }: KickPlayerButtonProps) {
  const t = useTranslations('Lobby');
  const anchor = useRef<HTMLSpanElement>(null);
  return (
    <span ref={anchor} data-kick-anchor="" className="contents">
      <ConfirmDialog
        triggerLabel={t('kickPlayer')}
        triggerAccessibleLabel={t('kickPlayerLabel', { name })}
        title={t('kickTitle', { name })}
        message={t('kickMessage', { name })}
        confirmLabel={t('kickConfirm')}
        cancelLabel={t('kickCancel')}
        pendingLabel={t('kickPending')}
        failureMessage={t('kickFailed')}
        onConfirm={() => requestRemoval(roomId, memberKey)}
        onDone={() => focusAfterKick(anchor.current)}
      />
    </span>
  );
}

// The kicked row leaves with the next snapshot, button included, so focus goes to the list heading, or to the page heading when the list goes too.
function focusAfterKick(anchor: HTMLElement | null): void {
  const target = headingOfList(anchor) ?? document.querySelector<HTMLElement>('h1');
  if (!target) return;
  target.setAttribute('tabindex', '-1');
  target.focus();
}

function headingOfList(anchor: HTMLElement | null): HTMLElement | null {
  const list = anchor?.closest<HTMLElement>('section[aria-labelledby]');
  if (!list) return null;
  const isLastKickable = list.querySelectorAll('[data-kick-anchor]').length <= 1;
  if (isLastKickable && list.querySelector('h1') === null) return null;
  return document.getElementById(list.getAttribute('aria-labelledby') ?? '');
}
