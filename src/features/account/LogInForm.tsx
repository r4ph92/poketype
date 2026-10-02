'use client';

import { useActionState, useEffect, useRef, type FormEvent } from 'react';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { PixelButton } from '@/components/pixel/PixelButton';
import { gameConfig } from '@/config/game';
import type { RoomId } from '@/domain/room-id';
import { logIn } from './log-in';
import { logInErrorTexts, type LogInFormText } from './log-in-form-text';
import { initialLogInState, logInFields, type LogInField } from './log-in-state';
import { SignUpInput, type InputSettings } from './SignUpInput';

const { username, password } = gameConfig.account;

const inputSettings: Record<LogInField, InputSettings> = {
  username: { type: 'text', autoComplete: 'username', maxLength: username.maxSubmittedLength },
  password: { type: 'password', autoComplete: 'current-password', maxLength: password.maxSubmittedLength },
};

type LogInFormProps = { text: LogInFormText; returnRoomId: RoomId | null };

export function LogInForm({ text, returnRoomId }: LogInFormProps) {
  const [state, formAction, pending] = useActionState(logIn, initialLogInState);
  const inputRefs = useRef<Partial<Record<LogInField, HTMLInputElement | null>>>({});
  const errors = logInErrorTexts(state.errors, text.errors);

  useEffect(() => {
    const firstInvalid = logInFields.find((field) => state.errors[field] !== undefined);
    if (firstInvalid) inputRefs.current[firstInvalid]?.focus();
  }, [state]);

  function blockWhilePending(event: FormEvent<HTMLFormElement>): void {
    if (pending) event.preventDefault();
  }

  return (
    <form action={formAction} onSubmit={blockWhilePending} noValidate aria-busy={pending} className="grid gap-4">
      {returnRoomId && <input type="hidden" name="returnRoomId" value={returnRoomId} />}
      {logInFields.map((field) => (
        <SignUpInput
          key={field}
          formName="login"
          field={field}
          settings={inputSettings[field]}
          text={text.fields[field]}
          error={errors[field]}
          attempt={state.attempt}
          defaultValue={field === 'username' ? state.submittedUsername : undefined}
          inputRef={(input) => {
            inputRefs.current[field] = input;
          }}
        />
      ))}
      {errors.form && (
        <DialogueBox tone="error">
          <p key={state.attempt} role="alert">
            {errors.form}
          </p>
        </DialogueBox>
      )}
      <PixelButton type="submit" pending={pending}>
        {text.submit}
      </PixelButton>
    </form>
  );
}
