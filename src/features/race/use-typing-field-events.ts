'use client';

import { useEffect, useEffectEvent, type RefObject } from 'react';
import { compositionCommit, type TypingInput } from '@/domain/typing-progress';
import { CompositionGuard } from './composition-guard';

type FieldListener = [eventName: string, listener: (event: Event) => void];

// Plain edits are cancelled and only described to onType. A dead key or input method composes in the field and is described once,
// by its commit; the field is emptied once nothing is composing, so its value is never read.
export function useTypingFieldEvents(ref: RefObject<HTMLTextAreaElement | null>, onType: (input: TypingInput) => void): void {
  const describe = useEffectEvent((input: TypingInput) => onType(input));

  useEffect(() => {
    const field = ref.current;
    if (!field) return;
    const listeners = typingFieldListeners(field, describe);
    for (const [eventName, listener] of listeners) field.addEventListener(eventName, listener);
    return () => {
      for (const [eventName, listener] of listeners) field.removeEventListener(eventName, listener);
    };
  }, [ref]);
}

function typingFieldListeners(field: HTMLTextAreaElement, describe: (input: TypingInput) => void): FieldListener[] {
  const guard = new CompositionGuard((task) => setTimeout(task, 0));
  const isComposing = (event: Event) => guard.isComposing || (event as InputEvent).isComposing;
  const emptyField = () => {
    field.value = '';
  };
  const describeEdit = (event: Event) => {
    if (isComposing(event)) return;
    event.preventDefault();
    describe(describedEdit(event as InputEvent));
  };
  const describeCommit = (event: Event) => {
    describe(describedCommit(event as CompositionEvent));
    guard.end(emptyField);
  };
  const emptyUnlessComposing = (event: Event) => {
    if (!isComposing(event)) emptyField();
  };
  return [['compositionstart', () => guard.start()], ['compositionend', describeCommit], ['beforeinput', describeEdit], ['input', emptyUnlessComposing]];
}

function describedEdit(event: InputEvent): TypingInput {
  return { inputType: event.inputType, data: event.data, isComposing: false };
}

function describedCommit(event: CompositionEvent): TypingInput {
  return { inputType: compositionCommit, data: event.data, isComposing: false };
}
