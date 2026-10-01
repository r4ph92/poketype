'use client';

import { useEffect, useEffectEvent, type ClipboardEvent, type DragEvent, type RefObject } from 'react';
import type { TypingInput } from '@/domain/typing-progress';
import { FieldHint, FieldLabel } from '@/components/pixel/FormField';
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
    <div className="grid gap-1">
      <FieldLabel htmlFor="typing-area">{label}</FieldLabel>
      <FieldHint id="typing-hint">{hint}</FieldHint>
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
        className="block w-full resize-none border-2 border-frame bg-cream-deep p-3 text-base text-ink aria-disabled:cursor-not-allowed aria-disabled:border-slate"
      />
    </div>
  );
}

function keepEmpty(): void {}

function refuse(event: ClipboardEvent | DragEvent): void {
  event.preventDefault();
}
