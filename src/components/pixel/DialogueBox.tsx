import Image from 'next/image';
import { artwork } from '@/assets/manifest';
import type { ReactNode } from 'react';
import { AlertIcon, CheckIcon } from './icons/icons';

const decorativeAlt = '';

export type DialogueTone = 'info' | 'error' | 'success';

type DialogueBoxProps = {
  tone?: DialogueTone;
  live?: 'status' | 'alert';
  heading?: ReactNode;
  children: ReactNode;
  portrait?: boolean;
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
    <span className="hidden size-20 shrink-0 items-center justify-center xs:flex">
      <Image src={artwork.guide.src} width={80} height={80} alt={decorativeAlt} unoptimized className="pixelated" />
    </span>
  );
}

// The first line of an error dialogue is the cause, so it takes the error color next to the alert icon.
export function DialogueBox({ tone = 'info', live, heading, children, portrait = true }: DialogueBoxProps) {
  const firstLineClass = tone === 'error' ? '[&>:first-child]:font-bold [&>:first-child]:text-error' : '';
  return (
    <div role={live} className={`pixel-notch flex min-w-0 items-start gap-4 border-4 bg-cream p-4 ${frameClass[tone]}`}>
      {portrait && <GuidePortrait />}
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
