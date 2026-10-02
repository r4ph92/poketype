'use client';

import type { ClipboardEvent, DragEvent, RefObject } from 'react';
import type { TypingInput } from '@/domain/typing-progress';
import { FieldHint, FieldLabel } from '@/components/pixel/FormField';
import { passageTextId } from './RacePassage';
import { useTypingFieldEvents } from './use-typing-field-events';

type TypingAreaProps = {
  ref: RefObject<HTMLTextAreaElement | null>;
  label: string;
  hint: string;
  isEnabled: boolean;
  onType: (input: TypingInput) => void;
};

// Uncontrolled: React restores a controlled value on every input event, which would cancel a dead key's composition.
export function TypingArea({ ref, label, hint, isEnabled, onType }: TypingAreaProps) {
  useTypingFieldEvents(ref, onType);

  return (
    <div className="grid gap-1">
      <FieldLabel htmlFor="typing-area">{label}</FieldLabel>
      <FieldHint id="typing-hint">{hint}</FieldHint>
      <textarea
        id="typing-area"
        ref={ref}
        onPaste={refuse}
        onDrop={refuse}
        readOnly={!isEnabled}
        aria-disabled={!isEnabled}
        aria-describedby={`typing-hint ${passageTextId}`}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        rows={1}
        className="block w-full resize-none border-2 border-frame bg-cream-deep p-3 text-base text-ink aria-disabled:cursor-not-allowed aria-disabled:border-slate"
      />
    </div>
  );
}

function refuse(event: ClipboardEvent | DragEvent): void {
  event.preventDefault();
}
