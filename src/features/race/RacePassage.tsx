import type { ReactNode } from 'react';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import type { TextLanguage } from '@/domain/text-settings';
import { splitPassage } from './passage-segments';

type RacePassageProps = {
  heading: string;
  passage: string;
  language: TextLanguage;
  characters: readonly string[];
  position: number;
  isRejected: boolean;
  children?: ReactNode;
};

export const passageTextId = 'passage-text';

const caretCharacterClass = 'border-b-[3px] border-ink bg-gold text-on-gold';
// Wavy against the caret's straight line, so a wrong character is told apart without colour.
const rejectedCharacterClass = 'bg-error-soft text-error underline decoration-wavy decoration-2 underline-offset-4';

// The coloured copy is hidden from screen readers; they read the plain passage, which the typing area points to.
export function RacePassage({ heading, passage, language, characters, position, isRejected, children }: RacePassageProps) {
  const { typed, current, upcoming } = splitPassage(characters, position, isRejected);
  return (
    <PixelPanel titleId="passage-heading" title={heading}>
      <p lang={language} aria-hidden="true" className="max-w-[48ch] text-passage font-medium tracking-[0.02em] whitespace-pre-wrap wrap-anywhere">
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
      {children}
    </PixelPanel>
  );
}
