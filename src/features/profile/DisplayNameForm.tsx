'use client';

import { useActionState, useEffect, useRef, type FormEvent } from 'react';
import { FieldError, FieldHint, FieldLabel, PixelInput } from '@/components/pixel/FormField';
import { PixelButton } from '@/components/pixel/PixelButton';
import { gameConfig } from '@/config/game';
import type { TrainerNameError } from '@/domain/trainer-name';
import { changeDisplayName } from './change-display-name';
import { initialDisplayNameState } from './display-name-state';

type DisplayNameFormProps = {
  currentName: string;
  label: string;
  hint: string;
  submitLabel: string;
  savedMessage: string;
  errors: Record<TrainerNameError, string>;
};

export function DisplayNameForm({ currentName, label, hint, submitLabel, savedMessage, errors }: DisplayNameFormProps) {
  const [state, formAction, pending] = useActionState(changeDisplayName, initialDisplayNameState);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.error) inputRef.current?.focus();
  }, [state]);

  function blockWhilePending(event: FormEvent<HTMLFormElement>): void {
    if (pending) event.preventDefault();
  }

  return (
    <form action={formAction} onSubmit={blockWhilePending} noValidate aria-busy={pending} className="grid gap-3">
      <FieldLabel htmlFor="display-name">{label}</FieldLabel>
      <PixelInput
        ref={inputRef}
        id="display-name"
        name="displayName"
        type="text"
        maxLength={gameConfig.trainerName.maxSubmittedLength}
        autoComplete="off"
        defaultValue={state.submittedName ?? currentName}
        aria-describedby={state.error ? 'display-name-hint display-name-error' : 'display-name-hint'}
        aria-invalid={state.error !== null}
      />
      <FieldHint id="display-name-hint">{hint}</FieldHint>
      {state.error && (
        <FieldError key={state.attempt} id="display-name-error">
          {errors[state.error]}
        </FieldError>
      )}
      {state.saved && (
        <p key={state.attempt} role="status" className="font-bold">
          {savedMessage}
        </p>
      )}
      <div>
        <PixelButton type="submit" pending={pending}>
          {submitLabel}
        </PixelButton>
      </div>
    </form>
  );
}
