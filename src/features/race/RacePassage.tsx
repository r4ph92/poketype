import type { ReactNode } from 'react';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { passageLanguage } from '@/config/passages';
import { splitPassage } from './passage-segments';

type RacePassageProps = {
  heading: string;
  passage: string;
  characters: readonly string[];
  position: number;
  isRejected: boolean;
  children?: ReactNode;
};

export const passageTextId = 'passage-text';

const caretCharacterClass = 'border-b-[3px] border-ink bg-gold text-on-gold';
const rejectedCharacterClass = 'border-b-[3px] border-error bg-error-soft text-error';

// The coloured copy is hidden from screen readers; they read the plain passage, which the typing area points to.
export function RacePassage({ heading, passage, characters, position, isRejected, children }: RacePassageProps) {
  const { typed, current, upcoming } = splitPassage(characters, position, isRejected);
  return (
    <PixelPanel titleId="passage-heading" title={heading}>
      <p lang={passageLanguage} aria-hidden="true" className="max-w-[48ch] text-passage font-medium tracking-[0.02em] whitespace-pre-wrap wrap-anywhere">
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
      <p id={passageTextId} lang={passageLanguage} className="sr-only">
        {passage}
      </p>
      {children}
    </PixelPanel>
  );
}
