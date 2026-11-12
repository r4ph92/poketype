'use client';

import { useTranslations } from 'next-intl';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { FieldHint } from '@/components/pixel/FormField';
import { PixelButton } from '@/components/pixel/PixelButton';
import { gameConfig } from '@/config/game';
import type { RoomId } from '@/domain/room-id';
import { hasEnoughPlayersToStart } from '@/domain/race';
import { raceWordLists } from '@/assets/word-lists';
import type { PickProblem } from '@/domain/character-picks';
import { textPickProblem } from '@/domain/race-text';
import type { TextSettings } from '@/domain/text-settings';
import { useRoomCommand, type RoomCommandState } from './use-room-command';

const hintId = 'start-race-hint';
const progressId = 'start-race-progress';

// aria-disabled rather than disabled keeps the button focusable, so its reason stays readable.
// Random text whose picked characters cannot give a text keeps the button unavailable and says why (CONF-07); the server refuses it too.
export function StartRaceControl({ roomId, playerCount, textSettings }: { roomId: RoomId; playerCount: number; textSettings: TextSettings }) {
  const t = useTranslations('Room');
  const { state, run: startRace } = useRoomCommand(roomId, 'start');
  const hasEnoughPlayers = hasEnoughPlayersToStart(playerCount);
  const textProblem = textSettings.kind === 'random' ? textPickProblem(textSettings, raceWordLists) : null;
  const canStart = hasEnoughPlayers && textProblem === null;
  const isPending = state === 'pending';
  return (
    <div className="grid gap-2">
      <PixelButton pending={isPending} unavailable={!canStart} describedBy={descriptionId(canStart, isPending)} onClick={startRace}>
        {t('startRace')}
      </PixelButton>
      <StartRaceNotes hasEnoughPlayers={hasEnoughPlayers} textProblem={textProblem} state={state} />
    </div>
  );
}

type StartRaceNotesProps = { hasEnoughPlayers: boolean; textProblem: PickProblem | null; state: RoomCommandState };

function StartRaceNotes({ hasEnoughPlayers, textProblem, state }: StartRaceNotesProps) {
  const t = useTranslations('Room');
  if (!hasEnoughPlayers) return <FieldHint id={hintId}>{t('needMorePlayers', { count: gameConfig.race.minimumPlayers })}</FieldHint>;
  if (textProblem?.kind === 'too-few-words') return <FieldHint id={hintId}>{t('textTooFewWords')}</FieldHint>;
  if (textProblem?.kind === 'never-found') return <FieldHint id={hintId}>{t('textNeverFound', { characters: textProblem.characters.join(' ') })}</FieldHint>;
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

function descriptionId(canStart: boolean, isPending: boolean): string | undefined {
  if (!canStart) return hintId;
  return isPending ? progressId : undefined;
}
