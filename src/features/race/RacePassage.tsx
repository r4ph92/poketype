import { passageLanguage } from '@/config/passages';
import { splitPassage } from './passage-segments';

type RacePassageProps = { heading: string; passage: string; characters: readonly string[]; position: number; isRejected: boolean };

export const passageTextId = 'passage-text';

// The coloured copy is hidden from screen readers; they read the plain passage, which the typing area points to.
export function RacePassage({ heading, passage, characters, position, isRejected }: RacePassageProps) {
  const { typed, current, upcoming } = splitPassage(characters, position, isRejected);
  return (
    <section aria-labelledby="passage-heading" className="mt-6 border-4 border-ink bg-white p-4">
      <h2 id="passage-heading" className="font-bold">
        {heading}
      </h2>
      <p lang={passageLanguage} aria-hidden="true" className="mt-2 max-w-[48ch] font-mono text-[28px] leading-[1.7] font-medium tracking-[0.02em] whitespace-pre-wrap wrap-anywhere [font-variant-ligatures:none]">
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
    </section>
  );
}

const caretCharacterClass = 'border-b-[3px] border-ink bg-gold text-on-gold';
const rejectedCharacterClass = 'border-b-[3px] border-error bg-error-soft text-error';
