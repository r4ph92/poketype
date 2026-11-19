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
import { longestCoherentWordCount } from '@/domain/coherent-limit';
import { textPickProblem } from '@/domain/race-text';
import type { TextSettings } from '@/domain/text-settings';
import { startFailureMessageKey } from './start-failure-message';
import { useRoomCommand, type RoomCommandState } from './use-room-command';

const hintId = 'start-race-hint';
const progressId = 'start-race-progress';

// aria-disabled rather than disabled keeps the button focusable, so its reason stays readable.
// Settings that cannot give a text (picked characters, CONF-07; a coherent text longer than the corpus, CONF-04) keep the button unavailable and say why; the server refuses them too.
export function StartRaceControl({ roomId, playerCount, textSettings }: { roomId: RoomId; playerCount: number; textSettings: TextSettings }) {
  const t = useTranslations('Room');
  const { state, failureStatus, run: startRace } = useRoomCommand(roomId, 'start');
  const hasEnoughPlayers = hasEnoughPlayersToStart(playerCount);
  const textProblem = textPickProblem(textSettings, raceWordLists);
  const canStart = hasEnoughPlayers && textProblem === null;
  const isPending = state === 'pending';
  return (
    <div className="grid gap-2">
      <PixelButton pending={isPending} unavailable={!canStart} describedBy={descriptionId(canStart, isPending)} onClick={startRace}>
        {t('startRace')}
      </PixelButton>
      <StartRaceNotes hasEnoughPlayers={hasEnoughPlayers} textProblem={textProblem} textSettings={textSettings} state={state} failureStatus={failureStatus} />
    </div>
  );
}

type StartRaceNotesProps = { hasEnoughPlayers: boolean; textProblem: PickProblem | null; textSettings: TextSettings; state: RoomCommandState; failureStatus: number | null };

function StartRaceNotes({ hasEnoughPlayers, textProblem, textSettings, state, failureStatus }: StartRaceNotesProps) {
  const t = useTranslations('Room');
  if (!hasEnoughPlayers) return <FieldHint id={hintId}>{t('needMorePlayers', { count: gameConfig.race.minimumPlayers })}</FieldHint>;
  if (textProblem?.kind === 'too-few-words') return <FieldHint id={hintId}>{t('textTooFewWords')}</FieldHint>;
  if (textProblem?.kind === 'coherent-too-long') return <FieldHint id={hintId}>{t('textCoherentTooLong', coherentLimit(textSettings, t))}</FieldHint>;
  if (textProblem?.kind === 'never-found') return <FieldHint id={hintId}>{t('textNeverFound', { characters: textProblem.characters.join(' ') })}</FieldHint>;
  if (state === 'pending') return <FieldHint id={progressId}>{t('starting')}</FieldHint>;
  if (state === 'failed') {
    return (
      <DialogueBox tone="error">
        <p role="alert">{t(startFailureMessageKey(failureStatus, textSettings.kind), coherentLimit(textSettings, t))}</p>
      </DialogueBox>
    );
  }
  return null;
}

function coherentLimit({ language }: TextSettings, t: ReturnType<typeof useTranslations<'Room'>>): { language: string; maximum: number } {
  return { language: t(language === 'fr' ? 'languageNameFr' : 'languageNameEn'), maximum: longestCoherentWordCount(language) };
}

function descriptionId(canStart: boolean, isPending: boolean): string | undefined {
  if (!canStart) return hintId;
  return isPending ? progressId : undefined;
}
