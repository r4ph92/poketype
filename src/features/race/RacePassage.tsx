'use client';

import type { ReactNode } from 'react';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import type { TextLanguage } from '@/domain/text-settings';
import { splitPassage } from './passage-segments';
import { usePassageWindow } from './use-passage-window';

type RacePassageProps = {
  heading: string;
  passage: string;
  language: TextLanguage;
  characters: readonly string[];
  position: number;
  isRejected: boolean;
  stats?: ReactNode;
  children?: ReactNode;
};

export const passageTextId = 'passage-text';

const caretCharacterClass = 'border-b-[3px] border-ink bg-gold text-on-gold';
// Wavy against the caret's straight line, so a wrong character is told apart without colour.
const rejectedCharacterClass = 'bg-error-soft text-error underline decoration-wavy decoration-2 underline-offset-4';

// The coloured copy is hidden from screen readers; they read the plain passage, which the typing area points to.
// The stats come after the passage in reading order; the grid draws them beside the heading.
export function RacePassage({ heading, passage, language, characters, position, isRejected, stats, children }: RacePassageProps) {
  const { typed, current, upcoming } = splitPassage(characters, position, isRejected);
  const windowRef = usePassageWindow(position);
  return (
    <PixelPanel titleId="passage-heading" title={heading} variant="compact" className="race-passage">
      <p ref={windowRef} lang={language} aria-hidden="true" className="passage-window max-w-[48ch] text-passage font-medium tracking-[0.02em] whitespace-pre-wrap wrap-anywhere">
        <span data-state="typed" className="text-success">
          {typed}
        </span>
        {current !== null && (
          <span data-state={isRejected ? 'rejected' : 'current'} className={isRejected ? rejectedCharacterClass : caretCharacterClass}>
            {current}
          </span>
        )}
        <span data-state="upcoming">{upcoming}</span>
      </p>
      <p id={passageTextId} lang={language} className="sr-only">
        {passage}
      </p>
      {stats && <div className="passage-stats border-b-2 border-slate pb-2">{stats}</div>}
      {children}
    </PixelPanel>
  );
}
