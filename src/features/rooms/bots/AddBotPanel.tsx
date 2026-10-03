'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { botLevels, type BotLevel } from '@/assets/bot-characters';
import { PixelButton } from '@/components/pixel/PixelButton';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { gameConfig } from '@/config/game';
import type { RoomId } from '@/domain/room-id';
import { requestBot, type BotRequestOutcome } from './request-bot';

type AddingState = { pendingLevel: BotLevel | null; outcome: BotRequestOutcome | null };

const failureKey = { 'level-full': 'levelFull', full: 'roomFull', failed: 'addFailed' } as const;

// One button per level: a click seats a bot of that level at once, and the next snapshot shows it in the roster.
export function AddBotPanel({ roomId }: { roomId: RoomId }) {
  const t = useTranslations('Bots');
  const [state, setState] = useState<AddingState>({ pendingLevel: null, outcome: null });

  async function add(level: BotLevel): Promise<void> {
    if (state.pendingLevel) return;
    setState({ pendingLevel: level, outcome: null });
    setState({ pendingLevel: null, outcome: await requestBot(roomId, level) });
  }

  return (
    <PixelPanel titleId="bots-title" title={t('panelTitle')}>
      <p className="text-sm">{t('hint')}</p>
      <div role="group" aria-label={t('levelsLabel')} className="grid gap-2">
        {botLevels.map((level) => (
          <AddLevelButton key={level} level={level} isPending={state.pendingLevel === level} onAdd={() => void add(level)} />
        ))}
      </div>
      <p role="status" className="text-sm font-bold">{state.pendingLevel && t('adding')}</p>
      {state.outcome && state.outcome !== 'added' && <p role="alert" className="text-sm font-bold text-error">{t(failureKey[state.outcome])}</p>}
    </PixelPanel>
  );
}

function AddLevelButton({ level, isPending, onAdd }: { level: BotLevel; isPending: boolean; onAdd: () => void }) {
  const t = useTranslations('Bots');
  const { wpm } = gameConfig.bots.levels[level];
  return (
    <PixelButton variant="secondary" pending={isPending} onClick={onAdd}>
      <span aria-hidden="true" className="flex w-full flex-wrap items-baseline justify-between gap-x-3">
        <span>{t(`levels.${level}`)}</span>
        <span className="font-mono text-sm normal-case tracking-normal">{t('wpm', { wpm })}</span>
      </span>
      <span className="sr-only">{t('addLevel', { level: t(`levels.${level}`), wpm })}</span>
    </PixelButton>
  );
}
