'use client';

import { useTranslations } from 'next-intl';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { FieldHint } from '@/components/pixel/FormField';
import { PixelButton } from '@/components/pixel/PixelButton';
import { gameConfig } from '@/config/game';
import type { RoomId } from '@/domain/room-id';
import { startBlockerOf, type StartBlocker } from '@/domain/race';
import { raceWordLists } from '@/assets/word-lists';
import type { PickProblem } from '@/domain/character-picks';
import type { CoherentLimits } from '@/domain/coherent-limit';
import { textPickProblem } from '@/domain/race-text';
import type { TextSettings } from '@/domain/text-settings';
import { startFailureMessageKey } from './start-failure-message';
import { useRoomCommand, type RoomCommandState } from './use-room-command';

const hintId = 'start-race-hint';
const progressId = 'start-race-progress';

// aria-disabled rather than disabled keeps the button focusable, so its reason stays readable.
// Settings that cannot give a text (picked characters, CONF-07; a coherent text longer than the corpus, CONF-04) keep the button unavailable and say why; the server refuses them too.
// racerCount is the humans who race plus the bots: a spectating host is in neither count (SALLE-01).
type StartRaceControlProps = { roomId: RoomId; racerCount: number; humanCount: number; textSettings: TextSettings; coherentLimits: CoherentLimits };

export function StartRaceControl({ roomId, racerCount, humanCount, textSettings, coherentLimits }: StartRaceControlProps) {
  const t = useTranslations('Room');
  const { state, failureStatus, run: startRace } = useRoomCommand(roomId, 'start');
  const blocker = startBlockerOf({ racerCount, humanCount });
  const textProblem = textPickProblem(textSettings, raceWordLists, coherentLimits);
  const canStart = blocker === null && textProblem === null;
  const isPending = state === 'pending';
  return (
    <div className="grid gap-2">
      <PixelButton pending={isPending} unavailable={!canStart} describedBy={descriptionId(canStart, isPending)} onClick={startRace}>
        {t('startRace')}
      </PixelButton>
      <StartRaceNotes blocker={blocker} textProblem={textProblem} textSettings={textSettings} coherentLimits={coherentLimits} state={state} failureStatus={failureStatus} />
    </div>
  );
}

type StartRaceNotesProps = { blocker: StartBlocker | null; textProblem: PickProblem | null; textSettings: TextSettings; coherentLimits: CoherentLimits; state: RoomCommandState; failureStatus: number | null };

function StartRaceNotes({ blocker, textProblem, textSettings, coherentLimits, state, failureStatus }: StartRaceNotesProps) {
  const t = useTranslations('Room');
  const hostRole = useTranslations('HostRole');
  if (blocker === 'no-human-player') return <FieldHint id={hintId}>{hostRole('needHumanPlayer')}</FieldHint>;
  if (blocker === 'not-enough-players') return <FieldHint id={hintId}>{t('needMorePlayers', { count: gameConfig.race.minimumPlayers })}</FieldHint>;
  if (textProblem?.kind === 'too-few-words') return <FieldHint id={hintId}>{t('textTooFewWords')}</FieldHint>;
  if (textProblem?.kind === 'coherent-too-long') return <FieldHint id={hintId}>{t('textCoherentTooLong', coherentLimit(textSettings, coherentLimits, t))}</FieldHint>;
  if (textProblem?.kind === 'picks-too-rare') return <FieldHint id={hintId}>{t('textPicksTooRare', coherentLimit(textSettings, coherentLimits, t))}</FieldHint>;
  if (textProblem?.kind === 'never-found') return <FieldHint id={hintId}>{t('textNeverFound', { characters: textProblem.characters.join(' ') })}</FieldHint>;
  if (state === 'pending') return <FieldHint id={progressId}>{t('starting')}</FieldHint>;
  if (state === 'failed') {
    return (
      <DialogueBox tone="error">
        <p role="alert">{t(startFailureMessageKey(failureStatus, textSettings.kind), coherentLimit(textSettings, coherentLimits, t))}</p>
      </DialogueBox>
    );
  }
  return null;
}

const levelNameKeys = { easy: 'levelNameEasy', medium: 'levelNameMedium', hard: 'levelNameHard' } as const;

function coherentLimit({ language, complexity }: TextSettings, limits: CoherentLimits, t: ReturnType<typeof useTranslations<'Room'>>): { language: string; level: string; maximum: number } {
  return { language: t(language === 'fr' ? 'languageNameFr' : 'languageNameEn'), level: t(levelNameKeys[complexity]), maximum: limits[language][complexity] };
}

function descriptionId(canStart: boolean, isPending: boolean): string | undefined {
  if (!canStart) return hintId;
  return isPending ? progressId : undefined;
}
