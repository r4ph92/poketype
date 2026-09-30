'use client';

import { useActionState, useEffect, useRef, type FormEvent } from 'react';
import { gameConfig } from '@/config/game';
import { signUp } from './sign-up';
import { errorTexts, type SignUpFormText } from './sign-up-form-text';
import { initialSignUpState, signUpFields, type SignUpField } from './sign-up-state';
import { SignUpInput, type InputSettings } from './SignUpInput';

const { username, password } = gameConfig.account;

const inputSettings: Record<SignUpField, InputSettings> = {
  username: { type: 'text', autoComplete: 'username', maxLength: username.maxSubmittedLength },
  password: { type: 'password', autoComplete: 'new-password', maxLength: password.maxSubmittedLength },
  confirmation: { type: 'password', autoComplete: 'new-password', maxLength: password.maxSubmittedLength },
};

export function SignUpForm({ text }: { text: SignUpFormText }) {
  const [state, formAction, pending] = useActionState(signUp, initialSignUpState);
  const inputRefs = useRef<Partial<Record<SignUpField, HTMLInputElement | null>>>({});
  const errors = errorTexts(state.errors, text.errors);

  useEffect(() => {
    const firstInvalid = signUpFields.find((field) => state.errors[field] !== undefined);
    if (firstInvalid) inputRefs.current[firstInvalid]?.focus();
  }, [state]);

  function blockWhilePending(event: FormEvent<HTMLFormElement>): void {
    if (pending) event.preventDefault();
  }

  return (
    <form action={formAction} onSubmit={blockWhilePending} noValidate className="mt-8 space-y-4 border-4 border-ink bg-cream p-4">
      {signUpFields.map((field) => (
        <SignUpInput
          key={field}
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
        <p key={state.attempt} role="alert" className="font-bold text-error">
          {errors.form}
        </p>
      )}
      <button type="submit" aria-disabled={pending} className="min-h-11 border-4 border-ink bg-gold px-6 font-bold">
        {text.submit}
      </button>
    </form>
  );
}
