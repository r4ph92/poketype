'use client';

import { useTranslations } from 'next-intl';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { PixelButton } from '@/components/pixel/PixelButton';
import type { RoomId } from '@/domain/room-id';
import { useRoomCommand } from './use-room-command';

const hintId = 'prepare-race-hint';

export function PrepareNextRaceControl({ roomId }: { roomId: RoomId }) {
  const t = useTranslations('Room');
  const { state, run: prepare } = useRoomCommand(roomId, 'prepare');
  const isPending = state === 'pending';
  return (
    <div className="grid gap-2">
      <PixelButton pending={isPending} describedBy={hintId} onClick={prepare}>
        {t('prepareRace')}
      </PixelButton>
      {/* The results backdrop is darker than a form's, so the hint takes the ink colour rather than the muted field hint. */}
      <p id={hintId} className="text-sm text-ink">{t(isPending ? 'preparing' : 'prepareHint')}</p>
      {state === 'failed' && (
        <DialogueBox tone="error">
          <p role="alert">{t('prepareFailed')}</p>
        </DialogueBox>
      )}
    </div>
  );
}
