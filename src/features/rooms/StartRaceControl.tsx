'use client';

import { useTranslations } from 'next-intl';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { FieldHint } from '@/components/pixel/FormField';
import { PixelButton } from '@/components/pixel/PixelButton';
import { gameConfig } from '@/config/game';
import type { RoomId } from '@/domain/room-id';
import { hasEnoughPlayersToStart } from '@/domain/race';
import { useRoomCommand, type RoomCommandState } from './use-room-command';

const hintId = 'start-race-hint';
const progressId = 'start-race-progress';

// aria-disabled rather than disabled keeps the button focusable, so its reason stays readable.
export function StartRaceControl({ roomId, playerCount }: { roomId: RoomId; playerCount: number }) {
  const t = useTranslations('Room');
  const { state, run: startRace } = useRoomCommand(roomId, 'start');
  const hasEnoughPlayers = hasEnoughPlayersToStart(playerCount);
  const isPending = state === 'pending';
  return (
    <div className="grid gap-2">
      <PixelButton pending={isPending} unavailable={!hasEnoughPlayers} describedBy={descriptionId(hasEnoughPlayers, isPending)} onClick={startRace}>
        {t('startRace')}
      </PixelButton>
      <StartRaceNotes hasEnoughPlayers={hasEnoughPlayers} state={state} />
    </div>
  );
}

function StartRaceNotes({ hasEnoughPlayers, state }: { hasEnoughPlayers: boolean; state: RoomCommandState }) {
  const t = useTranslations('Room');
  if (!hasEnoughPlayers) return <FieldHint id={hintId}>{t('needMorePlayers', { count: gameConfig.race.minimumPlayers })}</FieldHint>;
  if (state === 'pending') return <FieldHint id={progressId}>{t('starting')}</FieldHint>;
  if (state === 'failed') {
    return (
      <DialogueBox tone="error">
        <p role="alert">{t('startFailed')}</p>
      </DialogueBox>
    );
  }
  return null;
}

function descriptionId(hasEnoughPlayers: boolean, isPending: boolean): string | undefined {
  if (!hasEnoughPlayers) return hintId;
  return isPending ? progressId : undefined;
}
