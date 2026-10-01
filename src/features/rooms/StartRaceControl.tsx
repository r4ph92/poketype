'use client';

import { useTranslations } from 'next-intl';
import { gameConfig } from '@/config/game';
import type { RoomId } from '@/domain/room-id';
import { hasEnoughPlayersToStart } from '@/domain/race';
import { useStartRace, type StartRaceState } from './use-start-race';

const hintId = 'start-race-hint';
const progressId = 'start-race-progress';

// aria-disabled rather than disabled keeps the button focusable, so its reason stays readable.
export function StartRaceControl({ roomId, playerCount }: { roomId: RoomId; playerCount: number }) {
  const t = useTranslations('Room');
  const { state, startRace } = useStartRace(roomId);
  const hasEnoughPlayers = hasEnoughPlayersToStart(playerCount);
  const isPending = state === 'pending';
  const isUnavailable = !hasEnoughPlayers || isPending;
  return (
    <div className="mt-6 space-y-2">
      <button
        type="button"
        aria-disabled={isUnavailable}
        aria-describedby={descriptionId(hasEnoughPlayers, isPending)}
        onClick={() => {
          if (!isUnavailable) startRace();
        }}
        className="min-h-11 border-4 border-ink bg-ink px-6 font-bold text-cream aria-disabled:cursor-not-allowed aria-disabled:bg-white aria-disabled:text-ink"
      >
        {t('startRace')}
      </button>
      <StartRaceNotes hasEnoughPlayers={hasEnoughPlayers} state={state} />
    </div>
  );
}

function StartRaceNotes({ hasEnoughPlayers, state }: { hasEnoughPlayers: boolean; state: StartRaceState }) {
  const t = useTranslations('Room');
  if (!hasEnoughPlayers) return <p id={hintId}>{t('needMorePlayers', { count: gameConfig.race.minimumPlayers })}</p>;
  if (state === 'pending') return <p id={progressId}>{t('starting')}</p>;
  if (state === 'failed') {
    return (
      <p role="alert" className="font-bold text-error">
        {t('startFailed')}
      </p>
    );
  }
  return null;
}

function descriptionId(hasEnoughPlayers: boolean, isPending: boolean): string | undefined {
  if (!hasEnoughPlayers) return hintId;
  return isPending ? progressId : undefined;
}
