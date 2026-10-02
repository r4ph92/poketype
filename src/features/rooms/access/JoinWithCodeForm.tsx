'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useEffect, useId, useRef, type FormEvent } from 'react';
import { FieldError, FieldHint, FieldLabel, PixelInput } from '@/components/pixel/FormField';
import { PixelButton } from '@/components/pixel/PixelButton';
import { gameConfig } from '@/config/game';
import { joinWithCode } from './join-with-code';
import { initialJoinWithCodeState } from './join-with-code-state';

export function JoinWithCodeForm() {
  const t = useTranslations('RoomAccess');
  const { state, formAction, pending, input, blockWhilePending } = useJoinWithCode();
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  return (
    <form action={formAction} onSubmit={blockWhilePending} aria-busy={pending} className="join-code-form">
      <FieldLabel htmlFor={inputId}>{t('joinLabel')}</FieldLabel>
      <FieldHint id={hintId}>{t('joinHint')}</FieldHint>
      <div className="join-code-row">
        <PixelInput
          key={state.attempt}
          ref={input}
          id={inputId}
          name="code"
          defaultValue={state.submittedCode}
          maxLength={gameConfig.rooms.maxSubmittedCodeLength}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={state.error !== null}
          aria-describedby={state.error ? `${hintId} ${errorId}` : hintId}
        />
        <PixelButton type="submit" variant="secondary" pending={pending}>{t('joinSubmit')}</PixelButton>
      </div>
      {state.error && <FieldError key={state.attempt} id={errorId}>{t(`errors.${state.error}`)}</FieldError>}
    </form>
  );
}

// A refused code puts the focus back in the field, so the player can correct it at once.
function useJoinWithCode() {
  const [state, formAction, pending] = useActionState(joinWithCode, initialJoinWithCodeState);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.error) input.current?.focus();
  }, [state]);

  function blockWhilePending(event: FormEvent<HTMLFormElement>): void {
    if (pending) event.preventDefault();
  }

  return { state, formAction, pending, input, blockWhilePending };
}
