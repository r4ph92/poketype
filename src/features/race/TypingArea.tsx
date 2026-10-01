'use client';

import { useEffect, useEffectEvent, type ClipboardEvent, type DragEvent, type RefObject } from 'react';
import type { TypingInput } from '@/domain/typing-progress';
import { passageTextId } from './RacePassage';

type TypingAreaProps = {
  ref: RefObject<HTMLTextAreaElement | null>;
  label: string;
  hint: string;
  isEnabled: boolean;
  onType: (input: TypingInput) => void;
};

// Every edit is cancelled and only described to onType, so the field stays empty and its value is never read.
export function TypingArea({ ref, label, hint, isEnabled, onType }: TypingAreaProps) {
  const handleBeforeInput = useEffectEvent((event: InputEvent) => {
    event.preventDefault();
    onType({ inputType: event.inputType, data: event.data, isComposing: event.isComposing });
  });

  useEffect(() => {
    const field = ref.current;
    if (!field) return;
    const listener = (event: Event) => handleBeforeInput(event as InputEvent);
    field.addEventListener('beforeinput', listener);
    return () => field.removeEventListener('beforeinput', listener);
  }, [ref]);

  return (
    <div className="mt-6">
      <label htmlFor="typing-area" className="block font-bold">
        {label}
      </label>
      <p id="typing-hint" className="mt-1">
        {hint}
      </p>
      <textarea
        id="typing-area"
        ref={ref}
        value=""
        onChange={keepEmpty}
        onPaste={refuse}
        onDrop={refuse}
        readOnly={!isEnabled}
        aria-disabled={!isEnabled}
        aria-describedby={`typing-hint ${passageTextId}`}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        rows={2}
        className="mt-2 block w-full resize-none border-4 border-ink bg-white p-3 font-mono text-lg aria-disabled:cursor-not-allowed aria-disabled:bg-cream"
      />
    </div>
  );
}

function keepEmpty(): void {}

function refuse(event: ClipboardEvent | DragEvent): void {
  event.preventDefault();
}
