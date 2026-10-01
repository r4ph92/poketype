import type { ReactNode } from 'react';
import { AlertIcon, CheckIcon, GuideIcon } from './icons/icons';

export type DialogueTone = 'info' | 'error' | 'success';

type DialogueBoxProps = {
  tone?: DialogueTone;
  live?: 'status' | 'alert';
  heading?: ReactNode;
  children: ReactNode;
};

const frameClass: Record<DialogueTone, string> = {
  info: 'border-frame',
  error: 'border-error',
  success: 'border-frame',
};

function ToneIcon({ tone }: { tone: DialogueTone }) {
  if (tone === 'error') return <span className="text-error"><AlertIcon /></span>;
  if (tone === 'success') return <span className="text-success"><CheckIcon /></span>;
  return null;
}

// The portrait is decorative, so narrow screens give its width to the text.
function GuidePortrait() {
  return (
    <span className="pixel-frame-thin pixel-notch hidden size-14 shrink-0 items-center justify-center bg-cream-deep text-ink xs:flex">
      <GuideIcon size={48} />
    </span>
  );
}

// The first line of an error dialogue is the cause, so it takes the error color next to the alert icon.
export function DialogueBox({ tone = 'info', live, heading, children }: DialogueBoxProps) {
  const firstLineClass = tone === 'error' ? '[&>:first-child]:font-bold [&>:first-child]:text-error' : '';
  return (
    <div role={live} className={`pixel-notch flex min-w-0 items-start gap-4 border-4 bg-cream p-4 ${frameClass[tone]}`}>
      <GuidePortrait />
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <ToneIcon tone={tone} />
        <div className={`grid max-w-[65ch] min-w-0 gap-2 text-base ${firstLineClass}`}>
          {heading}
          {children}
        </div>
      </div>
    </div>
  );
}
