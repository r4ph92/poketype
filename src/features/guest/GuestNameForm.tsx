'use client';

import { useActionState, useEffect, useRef, type FormEvent } from 'react';
import { gameConfig } from '@/config/game';
import type { TrainerNameError } from '@/domain/trainer-name';
import { enterAsGuest } from './enter-as-guest';
import { initialGuestEntryState } from './guest-entry-state';

type GuestNameFormProps = {
  label: string;
  hint: string;
  submitLabel: string;
  errors: Record<TrainerNameError, string>;
};

export function GuestNameForm({ label, hint, submitLabel, errors }: GuestNameFormProps) {
  const [state, formAction, pending] = useActionState(enterAsGuest, initialGuestEntryState);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.error) inputRef.current?.focus();
  }, [state]);

  function blockWhilePending(event: FormEvent<HTMLFormElement>): void {
    if (pending) event.preventDefault();
  }

  return (
    <form action={formAction} onSubmit={blockWhilePending} noValidate className="mt-8 space-y-3 border-4 border-ink bg-cream p-4">
      <label htmlFor="trainer-name" className="block font-bold">
        {label}
      </label>
      <input
        ref={inputRef}
        id="trainer-name"
        name="trainerName"
        type="text"
        maxLength={gameConfig.trainerName.maxSubmittedLength}
        autoComplete="off"
        defaultValue={state.submittedName}
        aria-describedby={state.error ? 'trainer-name-hint trainer-name-error' : 'trainer-name-hint'}
        aria-invalid={state.error !== null}
        className="block min-h-11 w-full border-2 border-ink bg-white px-3 text-lg"
      />
      <p id="trainer-name-hint" className="text-sm">
        {hint}
      </p>
      {state.error && (
        <p key={state.attempt} id="trainer-name-error" role="alert" className="font-bold text-error">
          {errors[state.error]}
        </p>
      )}
      <button type="submit" aria-disabled={pending} className="min-h-11 border-4 border-ink bg-gold px-6 font-bold">
        {submitLabel}
      </button>
    </form>
  );
}
