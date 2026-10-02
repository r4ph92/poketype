'use client';

import { useActionState, useEffect, useRef, type FormEvent } from 'react';
import { FieldError, FieldHint, FieldLabel, PixelInput } from '@/components/pixel/FormField';
import { PixelButton } from '@/components/pixel/PixelButton';
import { gameConfig } from '@/config/game';
import type { RoomId } from '@/domain/room-id';
import type { TrainerNameError } from '@/domain/trainer-name';
import { enterAsGuest } from './enter-as-guest';
import { findRaceIntent } from './entry-destination';
import { initialGuestEntryState } from './guest-entry-state';

type GuestNameFormProps = {
  label: string;
  hint: string;
  submitLabel: string;
  errors: Record<TrainerNameError, string>;
  returnRoomId?: RoomId | null;
  findRaceLabel?: string;
};

export function GuestNameForm({ label, hint, submitLabel, errors, returnRoomId = null, findRaceLabel }: GuestNameFormProps) {
  const [state, formAction, pending] = useActionState(enterAsGuest, initialGuestEntryState);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.error) inputRef.current?.focus();
  }, [state]);

  function blockWhilePending(event: FormEvent<HTMLFormElement>): void {
    if (pending) event.preventDefault();
  }

  return (
    <form action={formAction} onSubmit={blockWhilePending} noValidate aria-busy={pending} className="grid gap-3">
      {returnRoomId && <input type="hidden" name="returnRoomId" value={returnRoomId} />}
      <FieldLabel htmlFor="trainer-name">{label}</FieldLabel>
      <PixelInput
        ref={inputRef}
        id="trainer-name"
        name="trainerName"
        type="text"
        maxLength={gameConfig.trainerName.maxSubmittedLength}
        autoComplete="off"
        defaultValue={state.submittedName}
        aria-describedby={state.error ? 'trainer-name-hint trainer-name-error' : 'trainer-name-hint'}
        aria-invalid={state.error !== null}
      />
      <FieldHint id="trainer-name-hint">{hint}</FieldHint>
      {state.error && (
        <FieldError key={state.attempt} id="trainer-name-error">
          {errors[state.error]}
        </FieldError>
      )}
      <div className="flex flex-wrap gap-4">
        <PixelButton type="submit" pending={pending}>
          {submitLabel}
        </PixelButton>
        {findRaceLabel && (
          <PixelButton type="submit" variant="secondary" pending={pending} submission={{ name: 'intent', value: findRaceIntent }}>
            {findRaceLabel}
          </PixelButton>
        )}
      </div>
    </form>
  );
}
